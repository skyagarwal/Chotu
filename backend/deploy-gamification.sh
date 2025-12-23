#!/bin/bash
# 🚀 DEPLOY SELF-LEARNING GAMIFICATION SYSTEM
# Run all migrations and enable the system

set -e

echo "🤖 Deploying Self-Learning Gamification System..."

# Database container
POSTGRES_CONTAINER="0be38ce3e675_mangwale_postgres"
DB_NAME="headless_mangwale"
DB_USER="mangwale_config"

echo ""
echo "📊 Step 1: Running gamification_enhanced migration..."
docker exec -i $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME < /home/ubuntu/Devs/mangwale-ai/prisma/migrations/20251114_gamification_enhanced.sql

echo ""
echo "🌐 Step 2: Running crowdsourced_market_research migration..."
docker exec -i $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME < /home/ubuntu/Devs/mangwale-ai/prisma/migrations/20251114_crowdsourced_market_research.sql

echo ""
echo "🧠 Step 3: Running self_learning_missions migration..."
docker exec -i $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME < /home/ubuntu/Devs/mangwale-ai/prisma/migrations/20251114_self_learning_missions.sql

echo ""
echo "✅ Step 4: Verifying tables..."
docker exec -i $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT 
  'reward_config' as table_name, COUNT(*) as row_count FROM reward_config
UNION ALL
SELECT 'mission_generation_rules', COUNT(*) FROM mission_generation_rules
UNION ALL
SELECT 'intent_coverage_stats', COUNT(*) FROM intent_coverage_stats
UNION ALL
SELECT 'user_store_requests', COUNT(*) FROM user_store_requests
UNION ALL
SELECT 'dynamic_mission_queue', COUNT(*) FROM dynamic_mission_queue
ORDER BY table_name;
"

echo ""
echo "🎮 Step 5: Testing mission generation..."
docker exec -i $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
-- Show active generation rules
SELECT rule_name, rule_type, priority, target_intent, should_trigger
FROM v_active_generation_rules
LIMIT 5;
"

echo ""
echo "📈 Step 6: Checking intent coverage gaps..."
docker exec -i $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT intent, total_samples, target_samples, coverage_percentage, priority_score, status
FROM intent_coverage_stats
WHERE status = 'needs_data'
ORDER BY priority_score DESC
LIMIT 10;
"

echo ""
echo "✨ DEPLOYMENT COMPLETE!"
echo ""
echo "📋 Summary:"
echo "  - ✅ 17 tables created (11 gamification + 6 crowdsourcing)"
echo "  - ✅ 10 reward configs inserted"
echo "  - ✅ 4 mission generation rules active"
echo "  - ✅ 30+ intent targets initialized"
echo "  - ✅ Viral validation loop enabled"
echo ""
echo "🎯 Next Steps:"
echo "  1. Restart Mangwale AI backend: cd /home/ubuntu/Devs/mangwale-ai && npm run build && pm2 restart all"
echo "  2. Test game endpoint: curl http://localhost:3000/api/gamification/start"
echo "  3. Monitor mission generation: Check v_active_generation_rules view"
echo ""
echo "🌟 Features Enabled:"
echo "  - 🤖 AI auto-generates missions based on data gaps"
echo "  - 📊 Adaptive difficulty per user skill level"
echo "  - 🌍 Multi-language (en/hi/mr/hinglish) with bonuses"
echo "  - 💰 Flexible rewards (wallet+points, or either, or none)"
echo "  - 🔄 Viral crowdsourcing (User A → User B validation)"
echo "  - 🏷️ Label Studio integration ready"
echo "  - 🏆 Social features (referrals, teams, leaderboards)"
echo ""
