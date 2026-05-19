# CitaDoc Phase 2 — Deploy Checklist

## What you need to do NOW

### 1. Run SQL in Supabase SQL Editor

Open Supabase Dashboard → SQL Editor → New Query

Paste and run:
- `supabase/migrations/20260520_logs_and_availability.sql`
- `supabase/migrations/20260520_validate_argentina.sql`

This creates:
- `logs` table (for observability)
- `doctor_availabilities` table
- RLS policies
- Migrates existing doctor schedules

### 2. Deploy Edge Function

```bash
supabase login
supabase functions deploy search-doctors
```

Or from dashboard:
- Edge Functions → Deploy new function
- Select `supabase/functions/search-doctors/index.ts`

### 3. Validate Argentina doctors exist

In SQL Editor, run the validation script. Check that:
- Doctors have `pais = 'argentina'`
- `activo = true`
- `verificacion_estado = 'verificado'`

If missing, run the quick fixes at the bottom of the validation script.

### 4. Test from Argentina

1. Open citadoc.lat in incognito
2. Accept location
3. Check console: should see `[Region] IP result: {cc: "ar", ...}`
4. Country should switch to Argentina
5. Doctors grid should show Argentine doctors

### 5. Test booking flow

1. Select an Argentine doctor
2. Pick a date + time slot
3. Fill patient info
4. Confirm
5. Check Supabase `citas` table — should have new row
