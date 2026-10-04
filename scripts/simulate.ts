if (typeof process.loadEnvFile === 'function' && !process.env.DATABASE_URL) {
  try {
    process.loadEnvFile();
  } catch {}
}

import { simulateSampleTournament } from '../src/server/api';
import { getFullTournament } from '../src/api/tournaments';
import { listPlayers } from '../src/api/players';
import { getDb } from '../src/db';
import { tournaments, bracketTiers, qualifierSubmissions, matches, games } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('\n🚀 Starting PostgreSQL Tournament Simulation...');
  const startTime = Date.now();

  try {
    // 1. Run simulation
    const simulated = await simulateSampleTournament();
    console.log(`\n🏆 Simulated Tournament: "${simulated.name}" (${simulated.slug})`);
    console.log(`   ID: ${simulated.id}`);
    console.log(`   Location: ${simulated.location} | Date: ${simulated.date}`);
    console.log(`   Qual Format: ${simulated.qualFormat}`);

    // 2. Fetch full tournament record from DB to verify relational persistence
    const reloaded = await getFullTournament(simulated.id);
    if (!reloaded) {
      throw new Error(`Failed to reload tournament ${simulated.id} from database!`);
    }

    console.log(`\n👥 Competitor Pool: ${reloaded.playersPool.length} authentic players`);
    // Assert no "Player X"
    const hasPlayerX = reloaded.playersPool.some(p => p.name.startsWith('Player '));
    if (hasPlayerX) {
      throw new Error('Detected forbidden "Player X" in competitor pool!');
    }
    console.log(`   Sample Competitors: ${reloaded.playersPool.slice(0, 5).map(p => p.name).join(', ')}...`);

    console.log(`\n📊 Qualifier Submissions: ${reloaded.qualifierSubmissions.length} recorded attempts`);
    const topScore = Math.max(...reloaded.qualifierSubmissions.map(s => s.score));
    console.log(`   Top Qualifier Score: ${topScore.toLocaleString()}`);

    console.log(`\n🏅 Bracket Tiers:`);
    for (const tier of reloaded.tiers) {
      console.log(`   • ${tier.name} (${tier.bracketType}):`);
      console.log(`     - Capacity: ${tier.playerCount} players`);
      console.log(`     - Best Of: ${tier.bestOf}`);
      const rounds = tier.bracket?.rounds || [];
      console.log(`     - Total Rounds: ${rounds.length}`);

      // Count completed matches in this tier
      const tierMatches = Object.values(reloaded.matchScores).filter(m => m.tierId === tier.id);
      const completedMatches = tierMatches.filter(m => m.isComplete);
      console.log(`     - Matches Simulated: ${completedMatches.length}/${tierMatches.length}`);

      // Check champion
      if (rounds.length > 0) {
        const finalRound = rounds[rounds.length - 1];
        const finalMatch = finalRound.matches[0];
        const finalScore = reloaded.matchScores[finalMatch?.id];
        if (finalScore?.winnerPlayerId) {
          const winner = reloaded.playersPool.find(p => p.id === finalScore.winnerPlayerId);
          console.log(`     - 🥇 Champion Crowned: ${winner ? winner.name : finalScore.winnerPlayerId}`);
        }
      }
    }

    // 3. Verify Database Integrity (Counts in relational tables)
    const db = getDb();
    const dbTiers = await db.select().from(bracketTiers).where(eq(bracketTiers.tournamentId, simulated.id));
    const dbSubs = await db.select().from(qualifierSubmissions).where(eq(qualifierSubmissions.tournamentId, simulated.id));

    console.log(`\n🗄️ Relational Integrity Check:`);
    console.log(`   - Tiers in DB: ${dbTiers.length}`);
    console.log(`   - Qualifiers in DB: ${dbSubs.length}`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Simulation completed successfully in ${duration}s!\n`);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Simulation failed with error:', err);
    process.exit(1);
  }
}

main();
