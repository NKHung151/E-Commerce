from neo4j import AsyncGraphDatabase
from config import settings

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
        async with self._driver.session() as session:
            result = await session.run(query, **params)
            return await result.data()

    async def create_constraints(self):
        await self.run("CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE")
        await self.run("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Product) REQUIRE p.id IS UNIQUE")

    async def merge_user(self, user_id: int):
        await self.run("MERGE (u:User {id: $user_id}) RETURN u", user_id=user_id)

    async def merge_product(self, product_id: int, name: str, category: str, price: float):
        await self.run(
            """
            MERGE (p:Product {id: $product_id})
            SET p.name = $name, p.category = $category, p.price = $price
            RETURN p
            """,
            product_id=product_id, name=name, category=category, price=price
        )

    async def record_action(self, user_id: int, product_id: int, action: str):
        rel_map = {
            "view": "VIEW",
            "add_to_cart": "ADD_TO_CART",
            "purchase": "BUY",
            "click": "VIEW"
        }
        rel_type = rel_map.get(action, "INTERACT")
        query = f"""
            MATCH (u:User {{id: $user_id}})
            MATCH (p:Product {{id: $product_id}})
            MERGE (u)-[r:{rel_type}]->(p)
            ON CREATE SET r.count = 1, r.last_at = timestamp()
            ON MATCH  SET r.count = r.count + 1, r.last_at = timestamp()
        """
        await self.run(query, user_id=user_id, product_id=product_id)

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
