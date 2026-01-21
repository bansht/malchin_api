# Бүртгэлийн OTP Заавар

## Бүртгэлийн процесс

### 1-р Алхам: Бүртгүүлэх (Register)

Хэрэглэгч өөрийн мэдээллээ оруулаад бүртгүүлэх mutation дуудна. Энэ нь автоматаар OTP код үүсгээд утас руу илгээнэ.

```graphql
mutation Register {
  register(input: {
    name: "Бат"
    email: "bat@example.com"
    phone: "99119911"
    address: "УБ хот"
    password: "securePassword123"
  }) {
    token    # Энэ хоосон байна
    user {
      id
      name
      email
      phone
      isVerified  # false байна
    }
  }
}
```

**Хариу:**
- `token` - хоосон (учир нь OTP баталгаажаагүй байна)
- `user.isVerified` - `false` (баталгаажаагүй)
- SMS-ээр 6 оронтой OTP код ирнэ (жишээ: 123456)

### 2-р Алхам: OTP Баталгаажуулах (Verify OTP)

Хэрэглэгч утсандаа ирсэн 6 оронтой кодыг оруулна:

```graphql
mutation VerifyOTP {
  verifyOTP(input: {
    phone: "99119911"
    otp: "123456"
  }) {
    success
    message
  }
}
```

**Хариу:**
```json
{
  "success": true,
  "message": "Утасны дугаар амжилттай баталгаажлаа"
}
```

### 3-р Алхам: Нэвтрэх (Login)

OTP баталгаажсаны дараа нэвтэрч болно:

```graphql
mutation Login {
  login(input: {
    phone: "99119911"
    password: "securePassword123"
  }) {
    token
    user {
      id
      name
      email
      phone
      isVerified  # одоо true болсон
    }
  }
}
```

## Эргэн OTP авах

Хэрэв хэрэглэгч OTP кодоо алдсан бол дахин авч болно:

```graphql
mutation SendOTP {
  sendOTP(input: {
    phone: "99119911"
  }) {
    success
    message
  }
}
```

## Алдааны кодууд

| Код | Тайлбар |
|-----|---------|
| `USER_ALREADY_EXISTS` | Энэ утас аль хэдийн бүртгэлтэй ба баталгаажсан |
| `EMAIL_ALREADY_EXISTS` | Энэ имэйл аль хэдийн бүртгэлтэй |
| `PHONE_ALREADY_EXISTS` | Энэ утас аль хэдийн бүртгэлтэй ба баталгаажсан |
| `SMS_SEND_FAILED` | OTP код илгээхэд алдаа гарсан |
| `OTP_NOT_FOUND` | OTP код олдсонгүй эсвэл хугацаа дууссан |
| `INVALID_OTP` | OTP код буруу эсвэл хугацаа дууссан |

## Тохиргоо

`.env` файлдаа OTP SMS API тохируулна уу:

```env
# Skytel SMS API тохиргоо
OTP="https://api.skytel.mn/sms/send?user=YOUR_USER&pass=YOUR_PASS&to=${phone}&text=Tanii%20bataglaajuulah%20code:%20${otp}"
```

**Анхаар:** `${phone}` ба `${otp}` placeholder-уудыг солихгүй үлдээнэ үү. Тэдгээр нь автоматаар орлогдоно.

## OTP хугацаа

- OTP код **5 минут** хүчинтэй
- Хугацаа дууссан бол дахин `sendOTP` дуудаж шинэ код авна

## Утасны дугаарын формат

Утасны дугаарыг автоматаар цэвэрлэнэ (тоо биш тэмдэгтүүдийг арилгана):

- `99119911` → `99119911` ✅
- `9911-9911` → `99119911` ✅
- `+976 9911 9911` → `97699119911` ✅

## Frontend жишээ (React)

```javascript
// 1. Бүртгүүлэх
const register = async () => {
  const result = await fetch('http://localhost:5000/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            user { id phone isVerified }
          }
        }
      `,
      variables: {
        input: {
          name: "Бат",
          email: "bat@example.com",
          phone: "99119911",
          password: "securePass123"
        }
      }
    })
  });
  
  // SMS-ээр OTP ирнэ
  console.log('OTP илгээгдлээ! Утсаа шалгана уу');
};

// 2. OTP баталгаажуулах
const verifyOTP = async (otpCode) => {
  const result = await fetch('http://localhost:5000/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation VerifyOTP($input: VerifyOTPInput!) {
          verifyOTP(input: $input) {
            success message
          }
        }
      `,
      variables: {
        input: { phone: "99119911", otp: otpCode }
      }
    })
  });
  
  // Амжилттай бол login хийнэ
};

// 3. Нэвтрэх
const login = async () => {
  const result = await fetch('http://localhost:5000/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
            user { id name phone }
          }
        }
      `,
      variables: {
        input: { phone: "99119911", password: "securePass123" }
      }
    })
  });
  
  const { token } = result.data.login;
  localStorage.setItem('token', token);
};
```

## Аюулгүй байдал

✅ OTP код 5 минутын дараа хүчингүй болно
✅ OTP код database-д хадгалагдана (нууцаар биш, гэхдээ хугацаатай)
✅ Баталгаажсаны дараа OTP устгагдана
✅ Password hash хэлбэрээр хадгалагдана
✅ JWT token ашиглан authenticate хийгдэнэ

## Debugging

Server console-д дэлгэрэнгүй log гарна:

```
📱 [SEND OTP] Checking phone: 99119911
🔐 [SEND OTP] Generated OTP: 123456 Expiry: 2026-01-20T05:15:00.000Z
📱 Sending OTP to phone: 99119911
✅ OTP sent successfully

📝 [REGISTER] Starting registration for phone: 99119911
✅ [REGISTER] User created, sending OTP...
✅ [REGISTER] OTP sent successfully

✅ [VERIFY OTP] Checking phone: 99119911 OTP: 123456
✅ [VERIFY OTP] User verified successfully
```
