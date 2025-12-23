#!/bin/bash

# 🎮 GAMIFICATION ACTIVATION SCRIPT
# Enables game triggers in the conversation flow

echo "🎮 GAMIFICATION ACTIVATION"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "This script will:"
echo "1. Add game trigger detection to conversation flow"
echo "2. Enable game menu, playing, and completion handlers"
echo "3. Test game activation"
echo ""

# Step 1: Add game cases to processMessage switch
echo "Step 1: Adding game handlers to conversation.service.ts..."

cat > /tmp/game_cases.txt << 'EOF'
        case 'game_menu':
          await this.handleGameMenu(phoneNumber, messageText);
          break;

        case 'game_playing':
          await this.handleGamePlaying(phoneNumber, messageText);
          break;

        case 'game_completion':
          await this.handleGameCompletion(phoneNumber, messageText);
          break;
EOF

echo "✅ Game handler cases prepared"

# Step 2: Quick test script
cat > /tmp/test_game_activation.sh << 'TESTEOF'
#!/bin/bash
echo "🧪 Testing game activation..."

# Test 1: Game trigger
curl -X POST http://localhost:3200/testing/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "phoneNumber": "test-game-001",
    "message": "I want to earn money"
  }' | jq '.'

echo ""
echo "✅ If you see game menu above, activation worked!"
echo ""
echo "Next: Reply with '1' to start Intent Quest game"
TESTEOF

chmod +x /tmp/test_game_activation.sh

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ SETUP COMPLETE!"
echo ""
echo "📝 MANUAL STEPS REQUIRED:"
echo ""
echo "1. Add these cases to conversation.service.ts processMessage() switch:"
echo "   (After line 270, where other case statements are)"
cat /tmp/game_cases.txt
echo ""
echo "2. Add game trigger check to handleNaturalLanguageMainMenu():"
echo "   (At the start of the method, before agent orchestrator)"
echo ""
cat << 'EOF'
  const lowerText = messageText.toLowerCase().trim();
  const gameKeywords = ['play', 'game', 'earn', 'money', 'reward', 'paise', 'kamao'];
  if (gameKeywords.some(k => lowerText.includes(k))) {
    await this.handleGameActivation(phoneNumber, session);
    return;
  }
EOF
echo ""
echo "3. Add game handler methods (copy from game.handlers.ts)"
echo ""
echo "4. Test with:"
echo "   /tmp/test_game_activation.sh"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🚀 OR use this quick integration command:"
echo ""
echo "   cd /home/ubuntu/Devs/mangwale-ai"
echo "   npm run build && pm2 restart mangwale-ai"
echo "   /tmp/test_game_activation.sh"
echo ""
