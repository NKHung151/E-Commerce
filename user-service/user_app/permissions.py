from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user) and getattr(request.user, 'role', None) == 'admin'


class IsStaffOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user) and getattr(request.user, 'role', None) in ['admin', 'staff']
