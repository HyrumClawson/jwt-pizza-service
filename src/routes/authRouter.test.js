
const request = require('supertest');
const app = require('../service');


if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}


let testUserAuthToken;
let testUser;
let testUserId;

beforeAll(async () => {
  testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserId = registerRes.body.user.id;
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);

  

  //
  //create a menu item 
  //create a store
  //create a franchise
  //save them to global variables 
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
  testUser.password = "lasl;d;adksj";
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(404);
  testUser.password = 'a';
});

test('update user info', async () => {
  let newEmail = randomName() + "test.email";
  let newPassword = randomName();
  let sendRequest = {"email": newEmail, "password": newPassword};
  const updateUser = await request(app).put(`/api/auth/${testUserId}`).send(sendRequest).set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(updateUser.status).toBe(200);
});

test('logout user', async () => {
  const logoutUser = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(logoutUser.body).toStrictEqual({ "message": "logout successful"});

});







function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}
