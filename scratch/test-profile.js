const fetch = global.fetch || require('node-fetch');

async function testUrl(name, url, cookie) {
  try {
    const res = await fetch(url, { headers: { 'Cookie': cookie } });
    console.log(`URL [${name}] Status:`, res.status);
    const body = await res.json();
    console.log(`URL [${name}] Response:`, JSON.stringify(body, null, 2));
  } catch (err) {
    console.error(`URL [${name}] Error:`, err);
  }
}

async function test() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '7778889991@taskflow.com',
        password: 'password123'
      })
    });

    const setCookie = loginRes.headers.get('set-cookie');
    if (!setCookie) {
      console.error('No set-cookie header returned');
      return;
    }
    const cookie = setCookie.split(';')[0];

    await testUrl('No ID', 'http://localhost:3000/api/v1/employees/profile', cookie);
    await testUrl('Real ObjectId', 'http://localhost:3000/api/v1/employees/profile?employeeId=6a5c7f7d0ee85a211646898b', cookie);
    await testUrl('Placeholder employee1', 'http://localhost:3000/api/v1/employees/profile?employeeId=employee1', cookie);

  } catch (err) {
    console.error('Error:', err);
  }
}

test();
