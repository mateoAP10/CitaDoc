-- Clinical guidelines knowledge base for CitaDoc triage AI
-- Run this in the Supabase SQL editor: https://supabase.com/dashboard/project/qxoomcqaafogczrvsyhg/sql

CREATE TABLE IF NOT EXISTS clinical_guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  fuente text NOT NULL,
  anio int,
  categoria text, -- 'abdomen','respiratorio','cardiovascular','neurologico','fiebre','general','trauma','alergico','urinario','cefalea','gastroenteritis'
  contenido text NOT NULL,
  tags text[],
  pubmed_id text,
  url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clinical_guidelines_fts_idx
  ON clinical_guidelines
  USING GIN(to_tsvector('simple', contenido || ' ' || titulo || ' ' || COALESCE(array_to_string(tags, ','), '')));

CREATE INDEX IF NOT EXISTS clinical_guidelines_categoria_idx
  ON clinical_guidelines(categoria);

CREATE INDEX IF NOT EXISTS clinical_guidelines_anio_idx
  ON clinical_guidelines(anio DESC);

-- RLS: table is internal, accessed only via service role (edge functions)
ALTER TABLE clinical_guidelines ENABLE ROW LEVEL SECURITY;

-- No public access; edge functions use service_role which bypasses RLS
-- Grant read to authenticated for future dashboard use if needed
-- CREATE POLICY "admin_read" ON clinical_guidelines FOR SELECT TO authenticated USING (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- SEED DATA — ~20 real clinical guideline summaries
-- ──────────────────────────────────────────────────────────────────────────────

INSERT INTO clinical_guidelines (titulo, fuente, anio, categoria, contenido, tags, url) VALUES

-- Manchester Triage System — General
(
  'Manchester Triage System — Urgency Categories',
  'Manchester Triage Group / Wiley-Blackwell',
  2023,
  'general',
  'The Manchester Triage System (MTS) assigns patients to one of five priority categories based on presenting complaint and discriminator signs. Category 1 (Immediate/Red): life-threatening emergencies requiring resuscitation — airway compromise, absent breathing, pulselessness, major haemorrhage, GCS <9. Category 2 (Very Urgent/Orange, ≤10 min): severe pain (≥7/10), altered consciousness, signs of shock. Category 3 (Urgent/Yellow, ≤60 min): moderate pain, moderate distress, high-risk history. Category 4 (Standard/Green, ≤120 min): mild pain, no systemic signs. Category 5 (Non-Urgent/Blue, ≤240 min): chronic problems, minor complaints without acute deterioration.',
  ARRAY['manchester','triage','urgencia','prioridad','categoria','emergencia','dolor','conciencia'],
  'https://www.triagenet.net/tools/manchester.php'
),

-- Manchester Triage System — Abdominal Pain
(
  'Manchester Triage System — Abdominal Pain Discriminators',
  'Manchester Triage Group',
  2023,
  'abdomen',
  'For abdominal pain triage under MTS, immediately life-threatening (Red) discriminators include peritonism signs (board-like rigidity, rebound tenderness), haemodynamic instability with abdominal pain, suspected ectopic rupture, or aortic dissection presentation. Very Urgent (Orange) includes severe localised pain with fever >38.5°C suggesting peritoneal irritation, abdominal pain in pregnant patients, or pain with vomiting and inability to tolerate fluids. Urgent (Yellow) includes pain score 4–6/10, pain >6 hours without improvement, associated urinary symptoms. Standard (Green): mild pain <4/10, able to eat/drink, no fever, duration <72 h without systemic compromise.',
  ARRAY['abdomen','dolor abdominal','peritonitis','rigidez','fiebre','vomitos','embarazo','triage'],
  'https://www.triagenet.net/tools/manchester.php'
),

-- Manchester Triage System — Fever
(
  'Manchester Triage System — Fever Discriminators',
  'Manchester Triage Group',
  2022,
  'fiebre',
  'Under MTS, fever triage discriminators assess severity by age and associated features. Immediate (Red): fever with meningism (neck stiffness, photophobia, non-blanching rash), convulsions, or septic shock signs. Very Urgent (Orange): temperature >41°C, febrile child <3 months, fever with altered consciousness or severe rigors. Urgent (Yellow): temperature 39–41°C in adults, febrile child 3–6 months, fever >5 days without focus. Standard (Green): temperature 38–39°C, adult >16 years, localised source identified (e.g. URTI symptoms), well-appearing, tolerating oral intake.',
  ARRAY['fiebre','temperatura','pediatria','sepsis','meningitis','convulsion','triage','edad'],
  'https://www.triagenet.net/tools/manchester.php'
),

-- ESI v4
(
  'Emergency Severity Index (ESI) v4 — Triage Decision Algorithm',
  'AHRQ / Agency for Healthcare Research and Quality',
  2020,
  'general',
  'ESI v4 is a validated five-level emergency triage instrument. Level 1: patient requires immediate life-saving intervention. Level 2: high-risk situation — altered mental status (AMS), severe distress, or vital sign instability. Level 3: stable but predicted to need ≥2 resources (labs, imaging, IV fluids). Level 4: stable, one resource expected. Level 5: stable, no resources expected (history + physical exam only). Vital sign danger zones triggering Level 2 consideration: HR >100 or <50, RR >20, SpO2 <92%, temperature >38.5°C in age <3 months. ESI has demonstrated inter-rater reliability κ=0.8–0.9 across emergency settings.',
  ARRAY['ESI','triage','urgencia','nivel','recursos','signos vitales','frecuencia cardiaca','saturacion'],
  'https://www.ahrq.gov/professionals/systems/hospital/esihandbk/index.html'
),

-- NICE CG141 — Acute abdominal pain adults
(
  'NICE CG141 — Acute Abdominal Pain in Adults: Assessment and Management',
  'National Institute for Health and Care Excellence (NICE)',
  2021,
  'abdomen',
  'NICE CG141 recommends structured assessment of acute abdominal pain in adults using history, examination, and targeted investigations. Red flag features mandating urgent hospital assessment: pain persisting >6 hours with vomiting, guarding or rigidity on palpation, haemodynamic instability, jaundice with fever, signs of bowel obstruction. The guideline endorses early analgesia (does not mask diagnosis) and serial abdominal examination. CT abdomen/pelvis is preferred over plain X-ray for suspected non-traumatic acute abdomen. Laparoscopic approach recommended for diagnostic uncertainty or suspected appendicitis when ultrasonography is inconclusive.',
  ARRAY['dolor abdominal agudo','adultos','NICE','apendicitis','obstruccion','peritonitis','analgesia','CT'],
  'https://www.nice.org.uk/guidance/cg141'
),

-- NICE NG51 — Fever in under 5s
(
  'NICE NG51 — Fever in Under 5s: Assessment and Initial Management',
  'National Institute for Health and Care Excellence (NICE)',
  2021,
  'fiebre',
  'NICE NG51 uses a traffic-light system (green/amber/red) for children under 5 with fever. Red features (immediate emergency referral): pale/mottled/blue skin, no response to social cues, weak high-pitched cry, non-blanching rash, bulging fontanelle, neck stiffness, focal neurological signs, seizures, temperature >38°C in infant <3 months. Amber features (urgent same-day assessment): temperature >39°C in 3–6 months, fever >5 days, rigors, swollen limb or joint, non-weight-bearing. Green (manage at home): well-appearing child, pink, responds normally, moist mucous membranes. Antipyretics (paracetamol or ibuprofen) recommended to improve comfort, not necessarily to normalise temperature.',
  ARRAY['fiebre','pediatria','menores 5 anos','semaforo','NICE','temperatura','meningitis','convulsion febrile','rash'],
  'https://www.nice.org.uk/guidance/ng51'
),

-- WHO IMCI
(
  'WHO Integrated Management of Childhood Illness (IMCI) — Triage and Danger Signs',
  'World Health Organization',
  2022,
  'fiebre',
  'WHO IMCI identifies general danger signs in children requiring immediate referral: inability to drink or breastfeed, vomiting everything, convulsions (current or recent), lethargy or unconsciousness. For fever assessment, IMCI classifies febrile illness as very severe febrile disease (stiff neck, petechiae, bleeding, confusion — urgent hospital transfer), or severe malaria/pneumonia/bacterial infection requiring antibiotic treatment. Respiratory rate thresholds for pneumonia: ≥60 breaths/min (0–2 months), ≥50 bpm (2–11 months), ≥40 bpm (1–5 years). Chest indrawing at any age indicates severe pneumonia.',
  ARRAY['IMCI','OMS','pediatria','signos peligro','fiebre','neumonia','malaria','convulsion','deshidratacion'],
  'https://www.who.int/publications/i/item/9789240041790'
),

-- ACEP Chest Pain Policy
(
  'ACEP Clinical Policy — Evaluation of Adult Patients with Non-traumatic Chest Pain',
  'American College of Emergency Physicians (ACEP)',
  2023,
  'cardiovascular',
  'ACEP recommends high-sensitivity troponin (hs-cTn) as the primary biomarker for myocardial injury evaluation, with a 0/1-hour or 0/2-hour accelerated diagnostic protocol in low-to-intermediate risk patients. High-risk features warranting immediate evaluation: typical ischemic chest pain (pressure, radiation to jaw/arm, diaphoresis, dyspnoea), new ST-segment changes, haemodynamic instability. The HEART score (History, ECG, Age, Risk factors, Troponin) stratifies 30-day MACE risk; score ≤3 identifies low-risk patients suitable for early discharge with follow-up. New-onset chest pain with exertion, syncope, or palpitations requires cardiac evaluation within 24–72 hours.',
  ARRAY['dolor toracico','cardiaco','troponina','ECG','ACEP','SCA','infarto','HEART score','disnea','urgencia'],
  'https://www.acep.org/clinical-resources/policy-statements/'
),

-- Upper respiratory infection
(
  'Management of Acute Upper Respiratory Tract Infection — Primary Care Guideline',
  'NICE / AAFP',
  2022,
  'respiratorio',
  'Acute upper respiratory tract infections (URTI) are predominantly viral and self-limiting (duration 7–10 days). Antibiotics are not indicated for uncomplicated URTI, acute rhinosinusitis <10 days, or pharyngitis without Centor ≥3 criteria. Management is symptomatic: adequate hydration, rest, analgesics/antipyretics (paracetamol/ibuprofen), saline nasal irrigation, first-generation antihistamines for rhinorrhoea. Red flags requiring medical assessment: dyspnoea at rest, stridor, inability to swallow, trismus, periorbital oedema, fever >7 days, symptoms worsening after initial improvement, immunocompromised status.',
  ARRAY['URTI','resfriado','rinitis','faringitis','tos','antibioticos','viral','sinusitis','garganta'],
  'https://www.nice.org.uk/guidance/ng84'
),

-- Gastroenteritis + dehydration
(
  'WHO/NICE Acute Gastroenteritis and Dehydration Assessment in Adults and Children',
  'WHO / NICE',
  2023,
  'gastroenteritis',
  'Acute gastroenteritis assessment centres on dehydration severity. Mild dehydration (<5%): thirst, slightly dry mucous membranes, normal skin turgor — manage with oral rehydration solution (ORS) at 50 mL/kg over 4 hours. Moderate dehydration (5–10%): sunken eyes, reduced skin turgor, tachycardia, oliguria — ORS or nasogastric rehydration, reassess every 2 hours. Severe dehydration (>10%) or signs of shock: rapid IV Ringer's lactate 20 mL/kg bolus, urgent hospitalisation. WHO ORS formula (per litre): 2.6 g NaCl, 1.5 g KCl, 2.9 g sodium citrate, 13.5 g glucose. Anti-emetics (ondansetron 4–8 mg) facilitate oral intake in moderate cases. Antibiotics only for bloody diarrhoea with fever or confirmed bacterial cause.',
  ARRAY['gastroenteritis','deshidratacion','diarrea','vomitos','SRO','rehidratacion','pediatria','adultos'],
  'https://www.who.int/publications/i/item/9789241549028'
),

-- Headache red flags — SNNOOP10
(
  'SNNOOP10 Criteria — Red Flag Headache Assessment',
  'European Headache Federation / International Headache Society',
  2022,
  'cefalea',
  'The SNNOOP10 mnemonic identifies red flag features mandating urgent neuroimaging and/or LP: Systemic illness (fever, myalgia, malignancy); Neoplasm history; Neurological deficit or cognitive change; Onset sudden/thunderclap (worst headache of life, reaches maximum in <1 minute); Older age (new headache >50 years); Pattern change from previous headaches; Positional component; Papilloedema; Progressive course or worsening; Postural aggravation; Precipitated by Valsalva; Pregnancy or peripartum. Thunderclap headache requires urgent CT non-contrast followed by LP if CT negative to exclude subarachnoid haemorrhage. Stable chronic tension-type or migraine without new features are low urgency.',
  ARRAY['cefalea','dolor cabeza','SNNOOP10','bandera roja','hemorragia subaracnoidea','trueno','meningitis','TAC','urgencia'],
  'https://link.springer.com/article/10.1007/s10194-019-0995-0'
),

-- UTI triage
(
  'Urinary Tract Infection Triage and Management — Primary Care Guidelines',
  'EAU / NICE',
  2023,
  'urinario',
  'UTI triage distinguishes uncomplicated lower UTI, complicated UTI, and upper UTI (pyelonephritis). Uncomplicated cystitis in women: dysuria, frequency, urgency without systemic features — manage with empiric antibiotics (nitrofurantoin 100 mg MR BD 5 days or trimethoprim 200 mg BD 7 days) without urine culture in straightforward cases. Signs mandating same-day or urgent review: fever >38°C, costovertebral angle tenderness (pyelonephritis), rigors, nausea/vomiting limiting oral antibiotics, UTI in men or children, recurrent UTI (≥2 in 6 months), pregnancy, renal transplant, or structural urinary tract anomaly. Haematuria without other UTI features warrants urgent urology referral to exclude malignancy.',
  ARRAY['infeccion urinaria','ITU','cistitis','pielonefritis','disuria','fiebre','antibiotico','EAU','NICE'],
  'https://uroweb.org/guidelines/urological-infections'
),

-- ACEP Abdominal Pain — Women
(
  'ACEP Clinical Policy — Acute Pelvic Pain and Abdominal Pain in Women of Reproductive Age',
  'American College of Emergency Physicians (ACEP)',
  2022,
  'abdomen',
  'Women of reproductive age with acute pelvic or lower abdominal pain require urine or serum beta-hCG as a first-line test to exclude ectopic pregnancy. Positive hCG with adnexal mass or free fluid on transvaginal ultrasound and haemodynamic instability constitutes a surgical emergency. Ovarian torsion presents with sudden severe unilateral pelvic pain often with nausea; absent Doppler flow is suggestive but not diagnostic — gynaecological consultation within 4–6 hours is mandatory. PID diagnosis requires cervical motion tenderness, uterine or adnexal tenderness; treat with antibiotics and admission if severe or tube-ovarian abscess suspected. Mittleschmerz and dysmenorrhea are low-urgency diagnoses of exclusion.',
  ARRAY['dolor pelvico','mujer','embarazo ectopico','torsion ovarica','PID','hCG','ecografia','urgencia ginecologica'],
  'https://www.acep.org/clinical-resources/policy-statements/'
),

-- Stroke / ACV
(
  'AHA/ASA Acute Ischemic Stroke Early Management Guidelines',
  'American Heart Association / American Stroke Association',
  2023,
  'neurologico',
  'Acute stroke is a time-critical emergency. The FAST mnemonic (Face drooping, Arm weakness, Speech difficulty, Time to call emergency services) identifies the most common presentations. Additional symptoms: sudden severe headache, vision loss, vertigo with ataxia, altered consciousness. Last-known-well time must be established immediately as IV alteplase is indicated within 4.5 hours of onset (with strict criteria) and mechanical thrombectomy within 24 hours for large vessel occlusion. Prehospital activation of stroke teams and bypass to stroke-capable centres reduces morbidity. Do NOT give aspirin before CT imaging rules out haemorrhage. Blood pressure management: tolerate up to 220/120 mmHg in non-thrombolysis candidates in first 24 hours.',
  ARRAY['ACV','ictus','stroke','trombolisis','FAST','hemiplejia','afasia','urgencia','tiempo'],
  'https://www.ahajournals.org/doi/10.1161/STR.0000000000000455'
),

-- Anaphylaxis
(
  'WAO/EAACI Anaphylaxis Guidelines — Recognition and Emergency Management',
  'World Allergy Organization / European Academy of Allergy and Clinical Immunology',
  2022,
  'alergico',
  'Anaphylaxis is a severe systemic allergic reaction requiring immediate adrenaline (epinephrine) IM 0.5 mg (0.5 mL of 1:1000) into the lateral thigh as first-line treatment. Diagnostic criteria: acute onset with skin/mucosal involvement PLUS respiratory compromise or haemodynamic collapse OR two or more system involvement after allergen exposure. Biphasic reactions occur in 5–20% of cases; minimum 4–6 hour observation recommended after symptom resolution. Supplemental oxygen, IV access, supine positioning, and call for emergency services are immediate priorities. Antihistamines and corticosteroids are adjuncts, NOT substitutes for epinephrine. Patients with prior anaphylaxis should be prescribed auto-injectable epinephrine and referred to allergy specialist.',
  ARRAY['anafilaxia','alergia','adrenalina','epinefrina','shock anafilactico','angioedema','urticaria','urgencia'],
  'https://www.worldallergy.org/UserFiles/file/AnaphylaxisGuidelines2020.pdf'
),

-- Trauma
(
  'ATLS — Advanced Trauma Life Support Primary Survey Triage Criteria',
  'American College of Surgeons',
  2023,
  'trauma',
  'ATLS primary survey (ABCDE) guides trauma triage. Immediate life threats: airway obstruction, tension pneumothorax, massive haemothorax, open pneumothorax, flail chest with respiratory compromise, cardiac tamponade. GCS ≤13, systolic BP <90 mmHg, or RR <10/>29/min after resuscitation trigger highest-priority triage. Secondary survey identifies mechanism-specific injuries. Spinal motion restriction indicated for: midline cervical tenderness, focal neurological deficit, altered consciousness, or high-energy mechanism. Permissive hypotension (target SBP 80–90 mmHg) preferred in penetrating trauma until haemorrhage control. Damage-control resuscitation (1:1:1 ratio PRBC:FFP:platelets) for massive transfusion.',
  ARRAY['trauma','ATLS','hemorragia','shock','fracturas','columna','GCS','urgencia','accidente'],
  'https://www.facs.org/quality-programs/trauma/atls/'
),

-- Chest pain — low-risk
(
  'ESC 2023 — Non-Cardiac Chest Pain and Low-Risk ACS Evaluation',
  'European Society of Cardiology',
  2023,
  'cardiovascular',
  'The ESC 2023 guidelines for acute coronary syndromes define a low-risk pathway using hs-troponin at 0 and 1 hour (GRACE score <109, no ischemic ECG changes, two negative troponin values). Patients meeting HEART score ≤3 with undetectable hs-troponin at 0 h can be considered for early discharge with outpatient stress testing within 72 hours. Musculoskeletal chest pain features: reproducible with palpation, pleuritic in nature, sharp/localised, young patient without cardiac risk factors. Gastroesophageal reflux causes 30–40% of non-cardiac chest pain. Panic disorder and anxiety account for 15–20%. Functional causes do not require urgent cardiac workup but merit appropriate follow-up.',
  ARRAY['dolor toracico','SCA','troponina','ESC','HEART','no cardiaco','musculoesqueletico','ansiedad','reflujo'],
  'https://www.escardio.org/Guidelines/Clinical-Practice-Guidelines/Acute-Coronary-Syndromes-ACS'
),

-- Sepsis
(
  'Surviving Sepsis Campaign — Hour-1 Bundle and Sepsis Recognition',
  'Society of Critical Care Medicine / ESICM',
  2021,
  'general',
  'Sepsis is life-threatening organ dysfunction caused by dysregulated host response to infection. Quick SOFA (qSOFA) screening: altered mental status (GCS <15), RR ≥22/min, systolic BP ≤100 mmHg — any 2/3 criteria triggers sepsis evaluation. Septic shock: vasopressor requirement to maintain MAP ≥65 mmHg AND serum lactate >2 mmol/L despite adequate volume. Hour-1 bundle: measure lactate (repeat if >2), obtain blood cultures before antibiotics, administer broad-spectrum antibiotics, 30 mL/kg IV crystalloid if BP low or lactate ≥4, vasopressors if hypotension persists. Every-hour delay in antibiotics in septic shock increases mortality ~7%. Any fever with confusion, tachycardia >100 bpm, and hypotension requires immediate sepsis assessment.',
  ARRAY['sepsis','shock septico','qSOFA','lactato','antibioticos','fiebre','taquicardia','urgencia','infeccion'],
  'https://www.sccm.org/SurvivingSepsisCampaign/Guidelines'
),

-- Dyspnea / respiratory
(
  'GOLD / GINA — Acute Exacerbation Triage: COPD and Asthma',
  'GOLD / Global Initiative for Asthma (GINA)',
  2023,
  'respiratorio',
  'Severe asthma exacerbation features: SpO2 <92%, PEF <50% predicted, unable to speak in full sentences, use of accessory muscles, silent chest (ominous). Life-threatening: SpO2 <90%, altered consciousness, exhaustion, cyanosis, hypotension, bradycardia. Immediate treatment: high-flow oxygen to maintain SpO2 93–95%, salbutamol 2.5–5 mg nebulised every 15–20 min, ipratropium 0.5 mg nebulised, systemic corticosteroids. COPD acute exacerbation (AECOPD) requiring hospital admission: marked increase in dyspnoea, inability to sleep, altered consciousness, SpO2 drop >3% from baseline, RR >25, HR >110. Controlled oxygen therapy targeting SpO2 88–92% in COPD to avoid hypercapnia.',
  ARRAY['asma','EPOC','disnea','SpO2','exacerbacion','salbutamol','oxigeno','GOLD','GINA','respiratorio'],
  'https://goldcopd.org/2023-gold-report/'
),

-- Paediatric fever under 3 months
(
  'AAP — Fever Without Source in Infants 0–36 Months: Evaluation and Management',
  'American Academy of Pediatrics (AAP)',
  2021,
  'fiebre',
  'AAP guidelines stratify febrile infants by age. Infants <21 days: all require full sepsis evaluation (blood, urine, CSF cultures) and empiric antibiotics pending results. Infants 22–28 days with temperature ≥38°C: hospitalise for evaluation. Infants 29–60 days: risk stratification with urinalysis, CBC, and procalcitonin; low-risk criteria (well-appearing, no focus, PCT <0.5 ng/mL, ANC <4000, UA negative) may permit outpatient management with close follow-up in 24 hours. Infants 2–3 months: same stratification; vaccinated children have lower risk for bacteraemia. Rectal temperature ≥38°C in any infant <3 months should be assessed same day; axillary measurements 0.5°C lower than rectal.',
  ARRAY['fiebre','lactante','recien nacido','sepsis neonatal','bacteriemia','AAP','pediatria','temperatura','PCT'],
  'https://publications.aap.org/pediatrics/article/148/4/e2021053052/181590'
);
