import { AUTHENTIC_COMPETITOR_NAMES } from '../src/features/tournament/data/authenticPlayers';
import { sql } from 'drizzle-orm';

if (typeof process.loadEnvFile === 'function' && !process.env.DATABASE_URL) {
  try {
    process.loadEnvFile();
  } catch {}
}

import { getDb, players } from '../src/db';

const COUNTRIES = [
  'US', 'JP', 'CA', 'DE', 'GB', 'FR', 'SE', 'PL', 'AU', 'BR',
  'KR', 'FI', 'IS', 'NL', 'DK', 'NO', 'ES', 'IT', 'MX', 'NZ'
];
const PLAYSTYLES: Array<'DAS' | 'Rolling' | 'Hypertap'> = [
  'Rolling', 'Rolling', 'Rolling', 'DAS', 'Hypertap'
];

export async function importAuthenticPlayers() {
  console.log(`\n🎮 Preparing to import ${AUTHENTIC_COMPETITOR_NAMES.length} authentic competitors into PostgreSQL...`);
  const db = getDb();

  const BATCH_SIZE = 100;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < AUTHENTIC_COMPETITOR_NAMES.length; i += BATCH_SIZE) {
    const batch = AUTHENTIC_COMPETITOR_NAMES.slice(i, i + BATCH_SIZE);
    const records = batch.map(name => {
      const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
      const playstyle = PLAYSTYLES[Math.floor(Math.random() * PLAYSTYLES.length)];
      const personalBest = Math.floor(750000 + Math.random() * 650000);
      return {
        name,
        country,
        avatarType: 'flag' as const,
        personalBest,
        playstyle,
        notes: 'Competitive Classic Tetris player',
      };
    });

    const res = await db
      .insert(players)
      .values(records)
      .onConflictDoNothing()
      .returning({ id: players.id });

    inserted += res.length;
    skipped += (batch.length - res.length);
  }

  console.log(`✅ Import complete!`);
  console.log(`   - Successfully inserted: ${inserted} players`);
  if (skipped > 0) {
    console.log(`   - Already existing (skipped): ${skipped} players`);
  }

  // Count total players in DB
  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(players);
  console.log(`📊 Total players now in database: ${countResult.count}\n`);
}

// Execute if run directly
const isDirectExecution = process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/importPlayers.ts');
if (isDirectExecution || import.meta.url === `file://${process.argv[1]}`) {
  importAuthenticPlayers()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Failed to import players:', err);
      process.exit(1);
    });
}
