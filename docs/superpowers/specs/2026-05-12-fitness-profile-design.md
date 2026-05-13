# Fitness Profile — Spec de Diseño

**Fecha:** 2026-05-12
**Alcance:** Rediseño de `src/pages/ClientDetail.tsx` como perfil fitness completo para coach. Fase 1 de 2 (Command Center queda para Fase 2).

---

## 1. Contexto

El CRM actual tiene un `ClientDetail.tsx` genérico con campos de contacto (nombre, email, teléfono, notas). Este spec reemplaza esa página con un ecosistema de alto rendimiento para coaching fitness individual.

**Stack existente:** React 18 · React Router v6 · shadcn/ui · Tailwind CSS · Framer Motion · Recharts · Supabase · Zod · React Hook Form.

---

## 2. Layout — Layout C: Panel Fijo + Tabs Dinámicos

```
┌─────────────────────────────────────────────────────────┐
│  TOP BAR: ← Clientes / Nombre · estado · Guardar Eliminar│
├────────────┬────────────────────────────────────────────┤
│            │ [📊 Métricas] [🫀 Cuerpo] [📸 Check-ins]   │
│  PANEL     │ [💪 Entreno]  [🥗 Nutrición]               │
│  IZQUIERDO │────────────────────────────────────────────│
│  (fijo,    │                                            │
│   200px)   │         CONTENIDO DEL TAB ACTIVO           │
│            │                                            │
└────────────┴────────────────────────────────────────────┘
```

**Panel izquierdo — siempre visible:**
- Avatar con iniciales + nombre + fecha de alta
- Bloque de alerta roja permanente: alergias e intolerancias
- Selector de ciclo actual: Definición / Volumen / Recomposición
- 4 métricas clave: Peso (kg) · % Grasa · Masa Muscular (kg) · IMC
- Objetivo diario: kcal + macros (P/C/G en gramos)
- Barra de suscripción: días restantes + fecha de vencimiento
- Sección colapsable "Info de contacto": email, teléfono, website, notas

---

## 3. Base de Datos — Tablas Supabase Nuevas

Todas las tablas incluyen `user_id` para RLS (row-level security) y `created_at`.

### 3.1 `client_fitness_profile`
Un registro por cliente. Datos del panel izquierdo.

| Campo | Tipo | Descripción |
|---|---|---|
| client_id | uuid FK → clients.id | |
| goal_cycle | text | 'definition' \| 'bulk' \| 'recomp' |
| kcal_target | int | |
| protein_g | int | |
| carbs_g | int | |
| fat_g | int | |
| allergies | text | Texto libre |
| injuries | text | Texto libre |
| subscription_end | date | |

### 3.2 `fitness_metrics`
Historial cronológico de composición corporal.

| Campo | Tipo |
|---|---|
| client_id | uuid FK |
| date | date |
| weight_kg | numeric(5,2) |
| body_fat_pct | numeric(4,2) |
| muscle_mass_kg | numeric(5,2) |
| bmi | numeric(4,2) |
| notes | text |

### 3.3 `body_measurements`
Medidas por zona corporal. Un registro por fecha de medición.

| Campo | Tipo |
|---|---|
| client_id | uuid FK |
| date | date |
| neck | numeric(4,1) |
| shoulders | numeric(4,1) |
| chest | numeric(4,1) |
| bicep_l | numeric(4,1) |
| bicep_r | numeric(4,1) |
| waist | numeric(4,1) |
| hips | numeric(4,1) |
| thigh_l | numeric(4,1) |
| thigh_r | numeric(4,1) |
| calf_l | numeric(4,1) |
| calf_r | numeric(4,1) |

### 3.4 `check_in_photos`
Fotos agrupadas por carpeta (fecha).

| Campo | Tipo |
|---|---|
| client_id | uuid FK |
| folder_date | date | Agrupa fotos del mismo check-in |
| photo_url | text | URL externa O URL de Supabase Storage |
| storage_path | text | Solo si fue subida a Storage (nullable) |
| label | text | 'front' \| 'back' \| 'side' \| custom |

### 3.5 `weekly_checkins`
Formulario de adherencia semanal (1–10).

| Campo | Tipo |
|---|---|
| client_id | uuid FK |
| week_date | date | Lunes de la semana |
| sleep_score | int (1-10) |
| hunger_score | int (1-10) |
| stress_score | int (1-10) |
| adherence_score | int (1-10) |
| notes | text |

### 3.6 `strength_records`
Histórico de records de fuerza por ejercicio.

| Campo | Tipo |
|---|---|
| client_id | uuid FK |
| exercise_name | text |
| weight_kg | numeric(5,2) |
| reps | int |
| estimated_1rm | numeric(5,2) | Calculado: weight × (1 + reps/30) |
| recorded_at | date |

### 3.7 `workout_plans`
Plan de entrenamiento asignado al cliente.

| Campo | Tipo |
|---|---|
| client_id | uuid FK |
| name | text |
| active | boolean | Solo un plan activo por cliente |

### 3.8 `workout_exercises`
Ejercicios dentro de un plan.

| Campo | Tipo |
|---|---|
| plan_id | uuid FK → workout_plans.id |
| day | text | 'A' \| 'B' \| 'C' \| ... |
| order | int | Orden dentro del día |
| name | text |
| sets | int |
| reps | text | Texto: "6", "8-10", "AMRAP" |
| rpe_rir | text | "@8", "RIR2", etc. |
| rest_sec | int |
| video_url | text | nullable |

### 3.9 `nutrition_plans`
Plan nutricional asignado.

| Campo | Tipo |
|---|---|
| client_id | uuid FK |
| name | text |
| kcal_target | int |
| protein_g | int |
| carbs_g | int |
| fat_g | int |
| active | boolean |

### 3.10 `nutrition_meals`
Comidas del día dentro del plan.

| Campo | Tipo |
|---|---|
| plan_id | uuid FK → nutrition_plans.id |
| name | text | "Desayuno", "Almuerzo", etc. |
| time | text | "07:00" |
| order | int |

### 3.11 `nutrition_items`
Ingredientes de cada comida.

| Campo | Tipo |
|---|---|
| meal_id | uuid FK → nutrition_meals.id |
| ingredient | text |
| qty | numeric(6,2) |
| unit | text | "g", "u", "ml" |
| kcal | int |
| protein_g | numeric(5,2) |
| carbs_g | numeric(5,2) |
| fat_g | numeric(5,2) |

---

## 4. Arquitectura de Componentes

```
src/pages/ClientDetail.tsx              ← shell + layout C (modificado)
src/types/fitness.ts                    ← tipos nuevos (modificado crm.ts para fitness)
src/components/fitness/
  LeftPanel.tsx                         ← panel izquierdo fijo
  tabs/
    MetricsTab.tsx
    BodyMappingTab.tsx
    CheckInsTab.tsx
    TrainingTab.tsx
    NutritionTab.tsx
  body/
    BodySvg.tsx                         ← SVG interactivo aislado
    MeasurementTooltip.tsx
src/hooks/fitness/
  useMetrics.ts
  useBodyMapping.ts
  useCheckIns.ts
  useTraining.ts
  useNutrition.ts
  useFitnessProfile.ts                  ← datos del panel izquierdo
```

**Principio:** cada tab y su hook son independientes. `ClientDetail.tsx` solo orquesta el layout y pasa `clientId` a cada componente.

---

## 5. Diseño por Tab

### 5.1 Tab Métricas (tab por defecto)

- Selector de rango: 1M / 3M / 6M / 1A
- Gráfica Recharts `LineChart` con tres series: peso, % grasa, masa muscular (ejes Y duales)
- Tabla cronológica descendente: fecha · peso · % grasa · músculo · IMC · delta vs anterior (↑↓ con color)
- Botón "**+ Registrar medición**" → dialog con form Zod: peso, % grasa, músculo, fecha, notas
- Sección de lesiones activas: lista editable de texto libre

### 5.2 Tab Cuerpo — Body Mapping SVG

- SVG del cuerpo humano esquemático (frontal + trasero), componente `BodySvg.tsx`
- Toggle **Frontal / Trasero**
- Toggles de capa: **Músculo** · **Grasa** · **Medidas** (pueden combinarse)
- Cada zona del SVG es un `<path>` o `<rect>` con `data-zone` (ej. `waist`, `chest`, `bicep_l`)
- **Mapa de calor:** color de relleno calculado comparando `body_measurements` actual vs hace 30 días. El color es semántico por tipo de zona:
  - Zonas de grasa (waist, hips, neck): `#ef4444` rojo si la medida bajó (pérdida de grasa) · `#f59e0b` amarillo si subió
  - Zonas de músculo (chest, bicep_l/r, shoulders, thigh_l/r, calf_l/r): `#10b981` verde si la medida subió (ganancia) · `#f59e0b` amarillo si bajó
  - Gris `#334155` → sin datos o sin cambio (delta < 0.5 cm)
- **Tooltip on hover:** zona → nombre · medida actual · medida anterior · delta
- Tabla lateral de medidas: 11 zonas · actual · anterior · Δ
- Botón "**+ Registrar medidas**" → dialog con form de 11 campos numéricos + fecha

### 5.3 Tab Check-ins

**Izquierda — Fotos:**
- Lista de carpetas por `folder_date` en orden descendente
- Click en carpeta → grid de fotos (3 columnas)
- Botón upload por carpeta: acepta archivo local (Supabase Storage) o campo URL
- **Slider Antes vs Después:** dos selectores de `folder_date` (Antes / Después). Si la carpeta tiene múltiples fotos, se usa la primera (`order by created_at asc`). Imagen dividida con divisor arrastrable: `input[type=range]` sobre dos imágenes absolutas con `clip-path`

**Derecha — Check-in semanal:**
- Selector de semana (lunes)
- 4 sliders 1–10: Sueño · Hambre · Estrés · Cumplimiento del plan
- Campo de notas libre
- Botón "**+ Guardar check-in**"
- Historial de últimas 4 semanas en cards compactos

### 5.4 Tab Entrenamiento

**Izquierda — PRs:**
- Lista de ejercicios con: nombre · 1RM estimado · barra de progreso relativa al máximo del cliente · delta vs mes anterior
- Ejercicios base predefinidos: Sentadilla · Press Banca · Peso Muerto (no borrables)
- Botón "**+ Agregar ejercicio**" para PRs personalizados
- Click en ejercicio → mini gráfica Recharts `AreaChart` de progresión en el tiempo

**Derecha — Rutina:**
- Tabs de días: A · B · C · D... (según plan activo)
- Tabla editable: Ejercicio · Series · Reps · RPE/RIR · Descanso · Video (▶ si hay URL)
- Edición inline en cada fila: guarda en Supabase al perder foco (`onBlur`), UI optimista con rollback + toast en error
- Botón "**+ Agregar ejercicio**" al final del día
- Si no hay plan activo → estado vacío con botón "Crear plan"

### 5.5 Tab Nutrición

**Izquierda — Plan:**
- Donut chart Recharts con distribución de macros (P/C/G por kcal)
- Lista de comidas del día con horario, ingredientes y totales de macros/kcal por comida
- Edición inline de ingredientes: cantidad, unidad, macros — guarda en Supabase al perder foco (`onBlur`)
- Botón "**+ Agregar comida**" y "**+ Agregar ingrediente**" por comida

**Derecha — Lista de compra:**
- Botón "**Auto-generar**": agrupa todos los ingredientes del plan × 7 días, suma cantidades por ingrediente, ordena por categoría (Proteínas / Carbohidratos / Grasas / Verduras / Otros)
- Lista con nombre · cantidad semanal · unidad
- Botón "**Copiar lista**": copia texto plano al portapapeles

---

## 6. Flujo de Datos

```
ClientDetail.tsx
  ├── useFitnessProfile(clientId)   → client_fitness_profile + clients
  ├── LeftPanel  ← recibe fitnessProfile, onUpdate
  └── Tabs (cada uno recibe clientId, fetcha sus propios datos via hook)
      ├── MetricsTab     ← useMetrics(clientId)      → fitness_metrics
      ├── BodyMappingTab ← useBodyMapping(clientId)  → body_measurements
      ├── CheckInsTab    ← useCheckIns(clientId)     → check_in_photos + weekly_checkins
      ├── TrainingTab    ← useTraining(clientId)     → workout_plans + workout_exercises + strength_records
      └── NutritionTab   ← useNutrition(clientId)   → nutrition_plans + nutrition_meals + nutrition_items
```

Cada hook expone: `{ data, loading, error, refetch, save, delete }`.

---

## 7. Decisiones Técnicas

| Decisión | Elección | Razón |
|---|---|---|
| Gráficas | Recharts (ya instalado) | Evita dependencia nueva |
| Body SVG | SVG inline en React | Máximo control de interactividad y colores |
| Slider fotos | `input[type=range]` + CSS clip-path | Sin librería externa |
| Upload fotos | Supabase Storage + URL externa | Ambas opciones requeridas |
| Forms | React Hook Form + Zod | Consistente con el resto del proyecto |
| 1RM estimado | Fórmula Epley: `weight × (1 + reps/30)` | Estándar de la industria |
| Tema visual | Dark (`#0f172a` / `#1e293b`) | Coherente con mockup aprobado |

---

## 8. Fuera de Scope (Fase 1)

- Command Center (ClientsSection.tsx) → Fase 2
- Notificaciones de renovación de suscripción → Fase 2
- App móvil para el cliente → futura consideración
- Integración con wearables / APIs externas

---

## 9. Orden de Implementación Sugerido

1. Tipos (`src/types/fitness.ts`) + migraciones SQL de las 11 tablas
2. Shell `ClientDetail.tsx` con layout C + `LeftPanel.tsx` + `useFitnessProfile`
3. Tab Métricas + `useMetrics` (más simple, valida el patrón)
4. Tab Cuerpo + `BodySvg.tsx` (más complejo, SVG interactivo)
5. Tab Check-ins + upload a Storage
6. Tab Entrenamiento + PRs
7. Tab Nutrición + lista de compra
