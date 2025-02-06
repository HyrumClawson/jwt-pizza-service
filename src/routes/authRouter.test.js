
const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}
const admin = createAdminUser;
const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('faulty login', async () => {
  if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
  }

  testUser.password = "lasl;d;adksj";
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(404);
  testUser.password = 'a';

});

test('order', async () => {
  // const loginRes = await request(app).put('/api/auth').send(testUser);
  // expect(loginRes.status).toBe(200);
  // expectValidJwt(loginRes.body.token);

  const menu = await request(app).get('/api/order/menu')
  expect(menu.body[0]).toMatchObject({"description": "A garden of delight",});

  const order = await request(app).post('/api/order').send('{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}');
  // expect(order.status).toBe(200);
  // expect(order.body).toBe("hello");


});

test('create franchise as admin', async () => {
  if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
  }
  const loginRes = await request(app).put('/api/auth').send(admin.user);
  expect(loginRes.status).toBe(500);
 // expectValidJwt(loginRes.body.token);


  const createFranchise = await request(app).post('/api/franchise').send('{"name": "pizzaPocket", "admins": [{"email": "f@jwt.com"}]}');


  //.send('{"franchiseId": 1, "name":"SLC"}')
  //expect(createFranchise.status).toBe(200);
  // expect(createFranchise).toBe(admin);
  //send('{"franchiseId": 1, "name":"SLC"}');
});





function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}