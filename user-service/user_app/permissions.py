from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role == 'admin'


class IsStaffOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and getattr(request.user, 'role', None) in ['admin', 'staff']
