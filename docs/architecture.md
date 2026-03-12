# Техническая архитектура Konsensus

## Обзор

Konsensus построен на современном стеке с серверным рендерингом и real-time возможностями.

```
┌─────────────────────────────────────────────┐
│                 Клиент                       │
│         Next.js (App Router + RSC)          │
│         Tailwind CSS                         │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
┌────────▼────────┐  ┌──────▼───────┐
│   Supabase      │  │  Claude API  │
│  - Auth         │  │  (Медиатор)  │
│  - PostgreSQL   │  │              │
│  - Realtime     │  └──────────────┘
│  - Storage      │
└─────────────────┘
```

## Стек

| Слой | Технология | Зачем |
|------|-----------|-------|
| Frontend | Next.js 15 + React 19 | SSR, App Router, RSC |
| Стили | Tailwind CSS | Быстрая разработка UI |
| Язык | TypeScript (strict) | Типобезопасность |
| Auth | Supabase Auth | Email/password, OAuth |
| БД | Supabase PostgreSQL | Реляционная, RLS |
| Realtime | Supabase Realtime | Обновления в реальном времени |
| ИИ | Claude API (Anthropic) | Медиация, анализ аргументов |
| Деплой | Vercel | Оптимизирован для Next.js |

## Схема базы данных (MVP)

### Таблицы

```sql
-- Профили пользователей (расширение Supabase Auth)
profiles
  id: uuid (FK → auth.users)
  display_name: text
  created_at: timestamp

-- Споры
disputes
  id: uuid (PK)
  title: text
  description: text
  status: enum ('open', 'in_progress', 'mediation', 'resolved', 'closed')
  creator_id: uuid (FK → profiles)
  opponent_id: uuid (FK → profiles, nullable)
  invite_code: text (unique)
  max_rounds: int (default 3)
  created_at: timestamp
  updated_at: timestamp

-- Аргументы
arguments
  id: uuid (PK)
  dispute_id: uuid (FK → disputes)
  author_id: uuid (FK → profiles)
  round: int
  position: text
  reasoning: text
  evidence: text (nullable)
  created_at: timestamp

-- Медиация (результат ИИ-анализа)
mediations
  id: uuid (PK)
  dispute_id: uuid (FK → disputes)
  analysis: jsonb  -- структурированный анализ от ИИ
  solutions: jsonb -- предложенные решения
  created_at: timestamp

-- Решения (выбор сторон)
resolutions
  id: uuid (PK)
  dispute_id: uuid (FK → disputes)
  chosen_solution: int  -- индекс выбранного решения
  accepted_by: uuid[]   -- кто принял
  status: enum ('proposed', 'accepted', 'rejected')
  created_at: timestamp
```

### Row Level Security (RLS)

- Пользователь видит только свои споры (как создатель или оппонент)
- Аргументы видны только участникам спора
- Аргументы раунда видны только когда обе стороны отправили свои

## Маршруты (App Router)

```
src/app/
├── page.tsx                    # Landing page
├── layout.tsx                  # Root layout
├── (auth)/
│   ├── login/page.tsx          # Вход
│   └── register/page.tsx       # Регистрация
├── dashboard/
│   ├── page.tsx                # Список споров пользователя
│   └── layout.tsx
├── dispute/
│   ├── new/page.tsx            # Создание спора
│   ├── [id]/
│   │   ├── page.tsx            # Страница спора
│   │   ├── argue/page.tsx      # Ввод аргументов
│   │   └── mediation/page.tsx  # Результат медиации
│   └── join/[code]/page.tsx    # Присоединение по инвайту
└── api/
    └── mediate/route.ts        # API route для Claude API
```

## Интеграция Claude API

### Промпт медиатора (концепт)

ИИ получает:
- Описание спора
- Аргументы обеих сторон (все раунды)
- Инструкцию быть нейтральным

ИИ возвращает (structured output):
- Анализ сильных/слабых сторон каждой позиции
- Точки соприкосновения
- 2-3 варианта решения с обоснованием

### Безопасность
- Claude API вызывается только через серверный route (`api/mediate`)
- API key хранится в env-переменной на сервере
- Rate limiting на эндпоинт медиации

## Деплой

### Development
```
npm run dev → localhost:3000
```

### Production (планируется)
- Vercel для Next.js
- Supabase Cloud для БД
- Environment variables через Vercel dashboard
