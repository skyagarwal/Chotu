#!/bin/bash
# Export NLU training data from PostgreSQL to JSONL format

OUTPUT_FILE="/home/ubuntu/Devs/mangwale-ai/training/export-db-training.jsonl"

echo "🔄 Exporting training data from PostgreSQL..."

# Clear previous export
> "$OUTPUT_FILE"

# Export data row by row
docker exec 0be38ce3e675_mangwale_postgres psql -U mangwale_config -d headless_mangwale -t -A -F'|' -c "
SELECT 
  text,
  intent,
  CASE 
    WHEN intent LIKE '%parcel%' THEN 3
    WHEN intent LIKE '%food%' OR intent LIKE '%pizza%' OR intent LIKE '%order%' THEN 4
    WHEN intent LIKE '%product%' OR intent LIKE '%shop%' THEN 5
    ELSE 1
  END as module_id,
  COALESCE(language, 'auto') as language,
  COALESCE(tone, 'neutral') as tone
FROM nlu_training_data
WHERE text IS NOT NULL AND intent IS NOT NULL AND intent != 'unknown'
ORDER BY created_at DESC;
" | while IFS='|' read -r text intent module language tone; do
  # Escape quotes in text
  text_escaped=$(echo "$text" | sed 's/"/\\"/g')
  echo "{\"text\":\"$text_escaped\",\"intent\":\"$intent\",\"module_id\":$module,\"language\":\"$language\",\"entities\":[],\"tone\":\"$tone\"}" >> "$OUTPUT_FILE"
done

COUNT=$(wc -l < "$OUTPUT_FILE")
echo "✅ Exported $COUNT training samples to $OUTPUT_FILE"

# Show sample
echo ""
echo "📊 Sample data:"
head -3 "$OUTPUT_FILE" | jq '.'
