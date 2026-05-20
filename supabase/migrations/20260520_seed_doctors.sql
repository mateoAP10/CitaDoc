-- ============================================================
-- CitaDoc Seed Data — Argentina + Ecuador test doctors
-- Only columns confirmed to exist in medicos table
-- ============================================================

insert into medicos (
  nombre, apellido, titulo, email,
  pais, ciudad, especialidades, seguros,
  precio, horario_desde, horario_hasta, dias_atencion,
  activo, verificacion_estado, plan, slug,
  whatsapp, whatsapp_activo, foto_url
) values
  (
    'Martin', 'Rodriguez', 'Dr.', 'martin.rodriguez@test.com',
    'argentina', 'Buenos Aires', array['Cardiologia', 'Medicina Interna'], array['OSDE', 'Galeno', 'Swiss Medical'],
    15000, '09:00', '17:00', array['lun', 'mar', 'mie', 'jue', 'vie'],
    true, 'verificado', 'destacado', 'dr-martin-rodriguez-cardiologia',
    '+5491112345678', true, null
  ),
  (
    'Laura', 'Fernandez', 'Dra.', 'laura.fernandez@test.com',
    'argentina', 'Buenos Aires', array['Dermatologia'], array['OSDE', 'Medicus'],
    12000, '10:00', '18:00', array['lun', 'mie', 'vie'],
    true, 'verificado', 'destacado', 'dra-laura-fernandez-dermatologia',
    '+5491123456789', true, null
  ),
  (
    'Carlos', 'Gomez', 'Dr.', 'carlos.gomez@test.com',
    'argentina', 'Cordoba', array['Traumatologia'], array['OSDE', 'Galeno'],
    18000, '08:00', '16:00', array['mar', 'jue', 'sab'],
    true, 'verificado', 'pro', 'dr-carlos-gomez-traumatologia',
    '+5491134567890', true, null
  ),
  (
    'Ana', 'Martinez', 'Dra.', 'ana.martinez@test.com',
    'argentina', 'Rosario', array['Pediatria'], array['Swiss Medical', 'Galeno'],
    10000, '09:00', '15:00', array['lun', 'mar', 'mie', 'jue', 'vie'],
    true, 'verificado', 'destacado', 'dra-ana-martinez-pediatria',
    '+5491145678901', true, null
  ),
  (
    'Javier', 'Lopez', 'Dr.', 'javier.lopez@test.com',
    'argentina', 'Mendoza', array['Oftalmologia'], array['OSDE'],
    14000, '10:00', '19:00', array['lun', 'mie', 'jue'],
    true, 'verificado', 'pro', 'dr-javier-lopez-oftalmologia',
    '+5491156789012', true, null
  ),
  (
    'Maria', 'Sanchez', 'Dra.', 'maria.sanchez@test.com',
    'ecuador', 'Quito', array['Ginecologia'], array['IESS', 'Seguros Equinoccial'],
    80, '08:00', '16:00', array['lun', 'mar', 'mie', 'jue', 'vie'],
    true, 'verificado', 'destacado', 'dra-maria-sanchez-ginecologia',
    '+593991234567', true, null
  ),
  (
    'Pedro', 'Vasquez', 'Dr.', 'pedro.vasquez@test.com',
    'ecuador', 'Guayaquil', array['Cardiologia'], array['IESS', 'Pacificard'],
    70, '09:00', '17:00', array['lun', 'mar', 'mie', 'jue', 'vie'],
    true, 'verificado', 'destacado', 'dr-pedro-vasquez-cardiologia',
    '+593992345678', true, null
  ),
  (
    'Carmen', 'Diaz', 'Dra.', 'carmen.diaz@test.com',
    'ecuador', 'Cuenca', array['Dermatologia'], array['IESS', 'Seguros Equinoccial'],
    60, '10:00', '18:00', array['mar', 'jue', 'sab'],
    true, 'verificado', 'pro', 'dra-carmen-diaz-dermatologia',
    '+593993456789', true, null
  )
on conflict do nothing;

-- Verify insertion
select pais, ciudad, count(*) as doctores
from medicos
where activo = true and verificacion_estado = 'verificado'
group by pais, ciudad
order by pais, doctores desc;
