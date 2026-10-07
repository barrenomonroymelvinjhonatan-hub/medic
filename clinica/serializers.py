
from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import (
    Pacient,
    Category,
    Medic,
    Status,
    Payment,
    Reservation,
    Setting,
)


User = get_user_model()

from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
)


class CustomTokenObtainPairSerializer(
    TokenObtainPairSerializer
):


    @classmethod
    def get_token(cls, user):

        token = super().get_token(user)

        # Información incluida dentro del JWT
        token["username"] = user.username
        token["name"] = user.name
        token["lastname"] = user.lastname
        token["is_staff"] = user.is_staff
        token["is_superuser"] = user.is_superuser

        return token

    def validate(self, attrs):

        data = super().validate(attrs)

        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "name": self.user.name,
            "lastname": self.user.lastname,
            "email": self.user.email,
            "is_staff": self.user.is_staff,
            "is_superuser": self.user.is_superuser,
        }

        return data



# ============================================================
# USER
# ============================================================

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer para lectura de usuarios.
    La contraseña nunca se devuelve.
    """

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "name",
            "lastname",
            "email",
            "is_active",
            "is_staff",
            "is_superuser",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]




class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "name", "lastname", "email",
                  "password", "is_active", "is_staff"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        user = User(**{k: v for k, v in attrs.items() if k != "password"})
        try:
            validate_password(attrs["password"], user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "name", "lastname", "email",
                  "password", "is_active", "is_staff"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        pw = attrs.get("password")
        if pw:
            try:
                validate_password(pw, self.instance)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"password": list(e.messages)})
        return attrs

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

# ============================================================
# PACIENT
# ============================================================

class PacientSerializer(serializers.ModelSerializer):

    class Meta:
        model = Pacient
        fields = [
            "id",
            "no",
            "name",
            "lastname",
            "gender",
            "day_of_birth",
            "email",
            "address",
            "phone",
            "image",
            "sick",
            "medicaments",
            "alergy",
            "is_favorite",
            "is_active",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
        ]


# ============================================================
# CATEGORY
# ============================================================

class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
        ]

        read_only_fields = [
            "id",
        ]


# ============================================================
# MEDIC
# ============================================================

class MedicSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    class Meta:
        model = Medic
        fields = [
            "id",
            "no",
            "name",
            "lastname",
            "gender",
            "day_of_birth",
            "email",
            "address",
            "phone",
            "image",
            "is_active",
            "created_at",
            "category",
            "category_name",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "category_name",
        ]


# ============================================================
# STATUS
# ============================================================

class StatusSerializer(serializers.ModelSerializer):

    class Meta:
        model = Status
        fields = [
            "id",
            "name",
        ]

        read_only_fields = [
            "id",
        ]


# ============================================================
# PAYMENT
# ============================================================

class PaymentSerializer(serializers.ModelSerializer):

    class Meta:
        model = Payment
        fields = [
            "id",
            "name",
        ]

        read_only_fields = [
            "id",
        ]


# ============================================================
# SETTING
# ============================================================

class SettingSerializer(serializers.ModelSerializer):

    class Meta:
        model = Setting
        fields = [
            "id",
            "name",
            "label",
            "kind",
            "val",
            "cfg_id",
        ]

        read_only_fields = [
            "id",
        ]


# ============================================================
# RESERVATION
# ============================================================

class ReservationSerializer(serializers.ModelSerializer):

    pacient_name = serializers.SerializerMethodField()
    medic_name = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    status_name = serializers.CharField(
        source="status.name",
        read_only=True,
    )
    payment_name = serializers.CharField(
        source="payment.name",
        read_only=True,
    )

    class Meta:
        model = Reservation

        fields = [
            "id",
            "title",
            "note",
            "message",
            "date_at",
            "time_at",
            "created_at",
            "user",

            "pacient",
            "pacient_name",

            "symtoms",
            "sick",
            "medicaments",

            "user",
            "user_name",

            "medic",
            "medic_name",

            "price",
            "is_web",

            "payment",
            "payment_name",

            "status",
            "status_name",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "pacient_name",
            "medic_name",
            "user_name",
            "status_name",
            "payment_name",
        ]

    def get_pacient_name(self, obj):
        if obj.pacient:
            return f"{obj.pacient.name} {obj.pacient.lastname}"

        return None

    def get_medic_name(self, obj):
        if obj.medic:
            return f"{obj.medic.name} {obj.medic.lastname}"

        return None

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.username

        return None
