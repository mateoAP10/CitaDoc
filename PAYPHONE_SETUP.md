# PayPhone Integration — Setup Guide

## Estado actual (post-fix)

### Frontend
- `citadoc-dashboard.html`: flujo robusto de PayPhone con callback real vía `postMessage`
- `citadoc-registro.html`: localStorage de pago se lee al crear la cuenta
- Diferenciación entre **PRO ($19)** y **PRO+WEB ($89)**
- `refreshMedico()` recarga estado desde Supabase sin logout

### Backend
- Edge Function `payphone-webhook` lista para desplegar

---

## Pasos para activar el webhook

### 1. Desplegar Edge Function

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login
supabase login

# Link a tu proyecto
supabase link --project-ref qxoomcqaafogczrvsyhg

# Deploy
supabase functions deploy payphone-webhook
```

### 2. Configurar URL de webhook en PayPhone

Ve al panel de PayPhone → Configuración → Webhooks y agrega:

```
https://qxoomcqaafogczrvsyhg.functions.supabase.co/payphone-webhook
```

**Método:** POST  
**Eventos:** `transactionApproved`

### 3. Verificar tabla `medicos`

Asegúrate de que existan estos campos:

```sql
-- Ya deberían existir
plan        text  -- 'gratuito' | 'pro' | 'pro_web'
plan_activo boolean
web_status  text  -- 'draft' | 'active'
```

Si `plan_activo` no existe, créalo:

```sql
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS plan_activo boolean DEFAULT false;
```

---

## Flujos

### PRO ($19)
1. Usuario hace click en "Activar PRO"
2. `initPayPhone('pro')` renderiza botón PayPhone ($19.99)
3. PayPhone procesa pago y envía `postMessage` + webhook
4. Frontend recibe `postMessage` → `activarProLocal()` → update Supabase
5. Webhook (backend) también actualiza Supabase como fallback
6. `refreshMedico()` recarga estado sin logout

### PRO+WEB ($89)
1. Usuario hace click en "Activar PRO+WEB"
2. `initPayPhone('pro_web')` renderiza botón PayPhone ($89)
3. PayPhone procesa pago y envía `postMessage` + webhook
4. Frontend recibe `postMessage` → `activarProWebLocal()` → update Supabase (`plan='pro_web', web_status='active'`)
5. Webhook (backend) también actualiza como fallback

### Registro con pago
1. Usuario paga en registro → `localStorage.setItem('citadoc_pago_pro', 'true')`
2. Al crear cuenta, el código lee localStorage y setea `plan='pro', plan_activo=true`

---

## Seguridad

- **NO confiar solo en frontend**: el webhook de PayPhone es la fuente de verdad final
- El frontend `postMessage` es una conveniencia para UX inmediata
- Si el usuario cierra la ventana antes del callback, el webhook activará el plan en segundos
- `refreshMedico()` en cada carga de dashboard sincroniza el estado cross-device

---

## Testing

1. Abrir dashboard → DevTools → Network
2. Click en "Activar PRO"
3. Completar pago de prueba en PayPhone (modo sandbox si disponible)
4. Verificar que `medicos.plan='pro'` y `plan_activo=true`
5. Verificar que el webhook responde 200 en los logs de Supabase
