const { MongoClient } = require('mongodb');

const url = 'mongodb+srv://halkhabertv2025_db_user:LWZcAu6HZ0mAdHH6@cluster0.vyctf3o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(url);
const dbName = 'zimmet_db';

async function check() {
  try {
    await client.connect();
    const db = client.db(dbName);
    
    const envCount = await db.collection('envanterler').countDocuments({ deletedAt: null });
    const zimCount = await db.collection('zimmetler').countDocuments({});
    
    console.log('Envanter sayisi: ' + envCount);
    console.log('Zimmet sayisi: ' + zimCount);
    
    // Sample zimmet
    const sample = await db.collection('zimmetler').findOne({});
    if (sample) {
      console.log('Ornek Zimmet EnvanterId: ' + sample.envanterId);
      console.log('Ornek Zimmet Durum: ' + sample.durum);
    }
    
    // Sample envanter
    const sampleEnv = await db.collection('envanterler').findOne({ deletedAt: null });
    if (sampleEnv) {
      console.log('Ornek Envanter ID: ' + sampleEnv.id);
      console.log('Ornek Envanter Marka: ' + sampleEnv.marka);
    }

  } catch (err) {
    console.error('Error: ' + err.message);
  } finally {
    await client.close();
  }
}

check();
