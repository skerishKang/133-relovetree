const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_5aH9oiPjWIyJ@ep-little-poetry-a1vjyiim-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  try {
    await c.connect();
    console.log('Connected to DB');

    // Test 1: Get table structure
    const schemaResult = await c.query(
      'SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position',
      ['trees']
    );
    console.log('\n=== Table Schema ===');
    schemaResult.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });

    // Test 2: Count by is_public
    const countResult = await c.query(
      'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_public = true) as public_count, COUNT(*) FILTER (WHERE is_public = false) as private_count FROM trees'
    );
    console.log('\n=== Counts ===');
    console.log(countResult.rows[0]);

    // Test 3: Query with is_public = true
    const queryResult = await c.query(
      'SELECT id, name, owner_id, is_public, created_at FROM trees WHERE is_public = $1',
      [true]
    );
    console.log('\n=== Public Trees Query (is_public = true) ===');
    console.log('Rows returned:', queryResult.rows.length);
    queryResult.rows.forEach(row => {
      console.log(row);
    });

    // Test 4: Check payload data
    const payloadResult = await c.query(
      'SELECT id, payload FROM trees LIMIT 5'
    );
    console.log('\n=== Payload Data ===');
    payloadResult.rows.forEach(row => {
      console.log(`id: ${row.id}, payload: ${JSON.stringify(row.payload)}`);
    });

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await c.end();
  }
}

main();