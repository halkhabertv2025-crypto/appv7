const { MongoClient } = require('mongodb');

// Connection URL from .env (usually mongodb://localhost:27017)
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'halkhabertv2025-crypto'; // Adjust if needed based on app config, usually assumes default or checks app code

async function checkInventory() {
  try {
    await client.connect();
    console.log('Connected successfully to server');
    const db = client.db(dbName);
    
    // 1. Find the inventory
    const serial = 'H66BBT'; // From user screenshot
    console.log(`Searching for inventory with serial: ${serial}`);
    
    const envanter = await db.collection('envanterler').findOne({ seriNumarasi: serial });
    
    if (!envanter) {
      console.log('Inventory NOT FOUND!');
      return;
    }
    
    console.log('Inventory Found:', {
      id: envanter.id,
      _id: envanter._id,
      marka: envanter.marka,
      model: envanter.model,
      durum: envanter.durum
    });

    // 2. Find Zimmet records
    const zimmetler = await db.collection('zimmetler').find({ envanterId: envanter.id }).toArray();
    console.log(`Found ${zimmetler.length} zimmet records for envanterId: ${envanter.id}`);
    
    zimmetler.forEach(z => {
      console.log('Zimmet:', {
        id: z.id,
        calisanId: z.calisanId,
        durum: z.durum,
        zimmetTarihi: z.zimmetTarihi,
        iadeTarihi: z.iadeTarihi,
        deletedAt: z.deletedAt
      });
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

checkInventory();
