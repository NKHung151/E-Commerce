from neo4j import AsyncGraphDatabase
from config import settings

# Behaviour action -> relationship type in the graph.
REL_TYPES = {
    "view": "VIEW",
    "click": "VIEW",
    "add_to_cart": "ADD_TO_CART",
    "purchase": "BUY",
}

class Neo4jClient:
    def __init__(self):
        self._driver = None

    async def connect(self):
        self._driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )
        await self._driver.verify_connectivity()

    async def close(self):
        if self._driver:
            await self._driver.close()

    async def run(self, query: str, **params):
        if self._driver is None:
            raise RuntimeError("Neo4j is not connected")
        async with self._driver.session() as session:
            result = await session.run(query, **params)
            return await result.data()

    async def create_constraints(self):
        await self.run("CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE")
        await self.run("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Product) REQUIRE p.id IS UNIQUE")

    async def merge_products(self, products: list, batch_size: int = 1000):
        """Upsert product nodes in batches: products are dicts {id, name, category, price}."""
        for i in range(0, len(products), batch_size):
            await self.run(
                """
                UNWIND $rows AS row
                MERGE (p:Product {id: row.id})
                SET p.name = row.name, p.category = row.category, p.price = row.price
                """,
                rows=products[i:i + batch_size],
            )

    async def prune_products(self, keep_ids: list):
        """Delete product nodes (and their edges) that are no longer in the catalogue."""
        rows = await self.run(
            "MATCH (p:Product) WHERE NOT p.id IN $ids DETACH DELETE p RETURN count(p) AS deleted", ids=keep_ids)
        return rows[0]["deleted"] if rows else 0

    async def record_event(self, user_id: int, product_id: int, action: str,
                           name: str = None, category: str = None, price: float = None):
        """Upsert user + product and count the interaction, in one round trip.

        (Previously three separate queries: merge_user, merge_product, record_action.)
        Product properties are only overwritten when known.
        """
        rel_type = REL_TYPES.get(action, "INTERACT")  # whitelisted: safe to interpolate
        await self.run(
            f"""
            MERGE (u:User {{id: $user_id}})
            MERGE (p:Product {{id: $product_id}})
            ON CREATE SET p.name = coalesce($name, 'Product ' + toString($product_id)),
                          p.category = coalesce($category, 'General'), p.price = coalesce($price, 0.0)
            ON MATCH SET p.name = coalesce($name, p.name), p.category = coalesce($category, p.category),
                         p.price = coalesce($price, p.price)
            MERGE (u)-[r:{rel_type}]->(p)
            ON CREATE SET r.count = 1, r.last_at = timestamp()
            ON MATCH  SET r.count = r.count + 1, r.last_at = timestamp()
            """,
            user_id=user_id, product_id=product_id, name=name, category=category, price=price,
        )

    async def clear_behaviour(self, batch_size: int = 10000):
        """Delete interaction and similarity edges (nodes are kept) so the graph can be
        rebuilt from the behaviour log without double-counting."""
        types = list(REL_TYPES.values()) + ["INTERACT", "SIMILAR_TO"]
        while True:
            rows = await self.run(
                "MATCH ()-[r]->() WHERE type(r) IN $types WITH r LIMIT $n DELETE r RETURN count(*) AS deleted",
                types=types, n=batch_size,
            )
            if not rows or rows[0]["deleted"] == 0:
                return

    async def record_events(self, rows: list, batch_size: int = 2000):
        """Bulk version for imports: rows of {user_id, product_id, action}, grouped per relationship type."""
        by_type = {}
        for row in rows:
            by_type.setdefault(REL_TYPES.get(row["action"], "INTERACT"), []).append(
                {"user_id": int(row["user_id"]), "product_id": int(row["product_id"])})
        for rel_type, items in by_type.items():
            for i in range(0, len(items), batch_size):
                await self.run(
                    f"""
                    UNWIND $rows AS row
                    MERGE (u:User {{id: row.user_id}})
                    MERGE (p:Product {{id: row.product_id}})
                    ON CREATE SET p.name = 'Product ' + toString(row.product_id), p.category = 'General', p.price = 0.0
                    MERGE (u)-[r:{rel_type}]->(p)
                    ON CREATE SET r.count = 1, r.last_at = timestamp()
                    ON MATCH  SET r.count = r.count + 1, r.last_at = timestamp()
                    """,
                    rows=items[i:i + batch_size],
                )

    async def recommend_collaborative(self, user_id: int, limit: int = 10):
        result = await self.run(
            """
            MATCH (u:User {id: $user_id})-[r:BUY|PURCHASE|VIEW|ADD_TO_CART]->(p:Product)
            WITH u, p ORDER BY coalesce(r.last_at, 0) DESC LIMIT 10
            MATCH (p)<-[:BUY|PURCHASE]-(other:User)-[:BUY|PURCHASE]->(rec:Product)
            WHERE NOT (u)-[:BUY|PURCHASE|VIEW]->(rec)
            RETURN rec.id AS product_id, count(*) AS score
            ORDER BY score DESC LIMIT $limit
            """,
            user_id=user_id, limit=limit
        )
        return {row["product_id"]: float(row["score"]) for row in result}

    async def recommend_similar(self, user_id: int, limit: int = 10):
        result = await self.run(
            """
            MATCH (u:User {id: $user_id})-[r:VIEW|ADD_TO_CART|BUY]->(p:Product)
            WITH u, p ORDER BY coalesce(r.last_at, 0) DESC LIMIT 10
            MATCH (p)-[:SIMILAR_TO|SIMILAR]->(rec:Product)
            WHERE NOT (u)-[:BUY|PURCHASE]->(rec)
            RETURN rec.id AS product_id, count(*) AS score
            ORDER BY score DESC LIMIT $limit
            """,
            user_id=user_id, limit=limit
        )
        return {row["product_id"]: float(row["score"]) for row in result}

    async def compute_similarity_edges(self):
        await self.run(
            """
            MATCH (p1:Product)<-[:BUY|PURCHASE]-(u:User)-[:BUY|PURCHASE]->(p2:Product)
            WHERE p1.id < p2.id
            WITH p1, p2, count(u) AS shared
            WHERE shared >= 2
            MERGE (p1)-[s:SIMILAR_TO]-(p2)
            SET s.score = shared
            """
        )

    async def recommend_similar_p2p(self, product_id: int, limit: int = 10):
        result = await self.run(
            """
            MATCH (p:Product {id: $product_id})-[s:SIMILAR_TO|SIMILAR]-(rec:Product)
            RETURN rec.id AS product_id, s.score AS score
            ORDER BY score DESC LIMIT $limit
            """,
            product_id=product_id, limit=limit
        )
        return {row["product_id"]: float(row["score"]) for row in result}

    async def recommend_bought_together(self, product_id: int, limit: int = 5):
        result = await self.run(
            """
            MATCH (p:Product {id: $product_id})<-[:BUY|PURCHASE]-(u:User)-[:BUY|PURCHASE]->(rec:Product)
            WHERE rec.id <> $product_id
            RETURN rec.id AS product_id, count(u) AS score
            ORDER BY score DESC LIMIT $limit
            """,
            product_id=product_id, limit=limit
        )

        return {row["product_id"]: float(row["score"]) for row in result}

neo4j_client = Neo4jClient()
