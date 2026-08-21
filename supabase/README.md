# Fat Stack — backend

Supabase project **fatstack-game** (`mgepcbfxijsdhmlmrtxh`, eu-central-1).

## What's stored

| Table | Contents | Who can read it |
|---|---|---|
| `plays` | Every finished round: score, banks, fumbles, character, initials | Nobody directly — only through the leaderboard views |
| `contacts` | Full name, email, marketing consent | **Nobody from the browser.** Supabase dashboard or service key only |

## Why it's safe to ship the key in the page

The game is a static site, so its Supabase key is visible to anyone who opens
devtools. That is fine and intended: the key grants only what the database policy
allows, which is

* read `leaderboard_today` / `leaderboard_alltime` (initials + score, nothing else)
* call `submit_play`, `set_initials`, `play_for_claim`, `claim_play`

Row Level Security is enabled on both tables with **no public policies**, and all
table privileges are revoked from `anon`. Verified by attempting, with the real
public key: reading `contacts` (401), reading `plays` (401), forging a 999,999,999
score (rejected), a 1-second round (rejected), claiming with a junk token
(rejected), and claiming twice (rejected).

## Useful queries

```sql
-- How many played today, and how many gave contact details
select count(*) as plays,
       count(*) filter (where claimed_at is not null) as claimed
from plays
where (created_at at time zone event_tz())::date = (now() at time zone event_tz())::date;

-- The marketing list
select c.full_name, c.email, c.created_at, p.score
from contacts c join plays p on p.id = c.play_id
where c.marketing_consent
order by c.created_at desc;

-- Which characters people pick
select character_id, count(*), round(avg(score)) as avg_score
from plays group by 1 order by 2 desc;
```

## Changing the event timezone

`event_tz()` returns `Asia/Dubai` and decides what "today" means on the board.
One-line change if the event moves.
