
from django.contrib.auth import get_user_model

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Pacient,
    Category,
    Medic,
    Status,
    Payment,
    Reservation,
    Setting,
)

from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    PacientSerializer,
    CategorySerializer,
    MedicSerializer,
    StatusSerializer,
    PaymentSerializer,
    ReservationSerializer,
    SettingSerializer,
    CustomTokenObtainPairSerializer,
)

from .permissions import IsAdmin

from .serializers import CustomTokenObtainPairSerializer
User = get_user_model()


# ============================================================
# AUTH
# ============================================================

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            RefreshToken(request.data["refresh"]).blacklist()
        except Exception:
            pass
        return Response(status=205)
    
class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class RefreshTokenView(TokenRefreshView):
    permission_classes = [AllowAny]


# ============================================================
# USERS
# ============================================================

class UserViewSet(viewsets.ModelViewSet):

    queryset = User.objects.all()

    permission_classes = [
        IsAuthenticated,
        IsAdmin,
    ]

    def get_serializer_class(self):

        if self.action == "create":
            return UserCreateSerializer

        if self.action in [
            "update",
            "partial_update",
        ]:
            return UserUpdateSerializer

        return UserSerializer


# ============================================================
# PACIENTES
# ============================================================

class PacientViewSet(viewsets.ModelViewSet):

    queryset = Pacient.objects.all()

    serializer_class = PacientSerializer

    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        queryset = Pacient.objects.all()

        name = self.request.query_params.get("name")
        lastname = self.request.query_params.get("lastname")
        email = self.request.query_params.get("email")
        is_active = self.request.query_params.get("is_active")

        if name:
            queryset = queryset.filter(
                name__icontains=name
            )

        if lastname:
            queryset = queryset.filter(
                lastname__icontains=lastname
            )

        if email:
            queryset = queryset.filter(
                email__icontains=email
            )

        if is_active is not None:
            queryset = queryset.filter(
                is_active=is_active.lower() == "true"
            )

        return queryset


# ============================================================
# CATEGORIAS
# ============================================================

class CategoryViewSet(viewsets.ModelViewSet):

    queryset = Category.objects.all()

    serializer_class = CategorySerializer

    permission_classes = [
        IsAuthenticated,
    ]

    def get_permissions(self):

        if self.action in [
            "create",
            "update",
            "partial_update",
            "destroy",
        ]:
            return [
                IsAuthenticated(),
                IsAdmin(),
            ]

        return [
            IsAuthenticated(),
        ]


# ============================================================
# MEDICOS
# ============================================================

class MedicViewSet(viewsets.ModelViewSet):

    queryset = Medic.objects.select_related(
        "category"
    ).all()

    serializer_class = MedicSerializer

    permission_classes = [
        IsAuthenticated,
    ]

    def get_permissions(self):

        if self.action in [
            "create",
            "update",
            "partial_update",
            "destroy",
        ]:
            return [
                IsAuthenticated(),
                IsAdmin(),
            ]

        return [
            IsAuthenticated(),
        ]

    def get_queryset(self):

        queryset = Medic.objects.select_related(
            "category"
        ).all()

        name = self.request.query_params.get("name")
        lastname = self.request.query_params.get("lastname")
        category = self.request.query_params.get("category")
        is_active = self.request.query_params.get("is_active")

        if name:
            queryset = queryset.filter(
                name__icontains=name
            )

        if lastname:
            queryset = queryset.filter(
                lastname__icontains=lastname
            )

        if category:
            queryset = queryset.filter(
                category_id=category
            )

        if is_active is not None:
            queryset = queryset.filter(
                is_active=is_active.lower() == "true"
            )

        return queryset


# ============================================================
# STATUS
# ============================================================

class StatusViewSet(viewsets.ModelViewSet):

    queryset = Status.objects.all()

    serializer_class = StatusSerializer

    permission_classes = [
        IsAuthenticated,
    ]

    def get_permissions(self):

        if self.action in [
            "create",
            "update",
            "partial_update",
            "destroy",
        ]:
            return [
                IsAuthenticated(),
                IsAdmin(),
            ]

        return [
            IsAuthenticated(),
        ]


# ============================================================
# PAYMENTS
# ============================================================

class PaymentViewSet(viewsets.ModelViewSet):

    queryset = Payment.objects.all()

    serializer_class = PaymentSerializer

    permission_classes = [
        IsAuthenticated,
    ]

    def get_permissions(self):

        if self.action in [
            "create",
            "update",
            "partial_update",
            "destroy",
        ]:
            return [
                IsAuthenticated(),
                IsAdmin(),
            ]

        return [
            IsAuthenticated(),
        ]


# ============================================================
# RESERVATIONS
# ============================================================

class ReservationViewSet(viewsets.ModelViewSet):

    queryset = Reservation.objects.select_related(
        "pacient",
        "medic",
        "user",
        "status",
        "payment",
    ).all()

    serializer_class = ReservationSerializer

    permission_classes = [
        IsAuthenticated,
    ]

    def get_queryset(self):

        queryset = Reservation.objects.select_related(
            "pacient",
            "medic",
            "user",
            "status",
            "payment",
        ).all()

        pacient = self.request.query_params.get("pacient")
        medic = self.request.query_params.get("medic")
        user = self.request.query_params.get("user")
        status = self.request.query_params.get("status")
        payment = self.request.query_params.get("payment")
        date = self.request.query_params.get("date")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        is_web = self.request.query_params.get("is_web")

        if pacient:
            queryset = queryset.filter(
                pacient_id=pacient
            )

        if medic:
            queryset = queryset.filter(
                medic_id=medic
            )

        if user:
            queryset = queryset.filter(
                user_id=user
            )

        if status:
            queryset = queryset.filter(
                status_id=status
            )

        if payment:
            queryset = queryset.filter(
                payment_id=payment
            )

        if date:
            queryset = queryset.filter(
                date_at=date
            )

        if date_from:
            queryset = queryset.filter(
                date_at__gte=date_from
            )

        if date_to:
            queryset = queryset.filter(
                date_at__lte=date_to
            )

        if is_web is not None:
            queryset = queryset.filter(
                is_web=is_web.lower() == "true"
            )

        return queryset

    def perform_create(self, serializer):
        """
        Asigna automáticamente el usuario autenticado.
        El frontend NO necesita enviar user.
        """

        serializer.save(
            user=self.request.user
        )


# ============================================================
# SETTINGS
# ============================================================

class SettingViewSet(viewsets.ModelViewSet):

    queryset = Setting.objects.all()

    serializer_class = SettingSerializer

    permission_classes = [
        IsAuthenticated,
        IsAdmin,
    ]

