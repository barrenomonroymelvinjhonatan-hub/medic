
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    LoginView,
    RefreshTokenView,

    UserViewSet,
    PacientViewSet,
    CategoryViewSet,
    MedicViewSet,
    StatusViewSet,
    PaymentViewSet,
    ReservationViewSet,
    SettingViewSet,
    LogoutView,
)


router = DefaultRouter()

router.register(
    r"users",
    UserViewSet,
    basename="users",
)

router.register(
    r"pacients",
    PacientViewSet,
    basename="pacients",
)

router.register(
    r"categories",
    CategoryViewSet,
    basename="categories",
)

router.register(
    r"medics",
    MedicViewSet,
    basename="medics",
)

router.register(
    r"status",
    StatusViewSet,
    basename="status",
)

router.register(
    r"payments",
    PaymentViewSet,
    basename="payments",
)

router.register(
    r"reservations",
    ReservationViewSet,
    basename="reservations",
)

router.register(
    r"settings",
    SettingViewSet,
    basename="settings",
)


urlpatterns = [

    # ==============================
    # AUTENTICACIÓN
    # ==============================

    path(
        "auth/login/",
        LoginView.as_view(),
        name="login",
    ),

    path("auth/logout/", LogoutView.as_view(), name="logout"),
    
    path(
        "auth/refresh/",
        RefreshTokenView.as_view(),
        name="token_refresh",
    ),

    # ==============================
    # API
    # ==============================

    path(
        "",
        include(router.urls),
    ),
]

