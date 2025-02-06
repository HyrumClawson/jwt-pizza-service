const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}


let testUserAuthToken;
let testUserId;
let adminUserAuthToken;
let admin;
let testUser;
let franchiseId;

beforeAll(async () => {
  //restaurantOwner = createFranchiseeUser();
  admin = await createAdminUser();
  testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  const adminLoginRes = await request(app).put('/api/auth').send(admin);
  adminUserAuthToken = adminLoginRes.body.token;


  let nameOfNewFranchise = randomName();
  let franchiseRequest = {name: nameOfNewFranchise, admins: [{email: testUser.email}]};
  const franchiseCreationRes = await request(app).post('/api/franchise').send(franchiseRequest).set('Authorization', `Bearer ${adminUserAuthToken}`);
  franchiseId = franchiseCreationRes.body.Id;
  //is a login request
  //const franchiseeLoginRes =  await request(app).put('/api/auth').send(restaurantOwner);
  //login request for admin
  
  //console.log('admin token', adminUserAuthToken)
  //franchiseeUserAuthToken = franchiseeLoginRes.body.token;
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.Id;

  expectValidJwt(testUserAuthToken);
  admin = createAdminUser();
  
  //create a menu item 
  //create a store
  //create a franchise
  //save them to global variables 
});



test('create franchise as admin', async () => {
    let nameOfNewFranchise = randomName();
    let franchiseRequest = {name: nameOfNewFranchise, admins: [{email: testUser.email}]};
    const franchiseCreationRes = await request(app).post('/api/franchise').send(franchiseRequest).set('Authorization', `Bearer ${adminUserAuthToken}`);
    //might need to change it to franchiseId
    franchiseId = franchiseCreationRes.body.Id;
    expect(franchiseCreationRes.status).toBe(200);
  });

test('get all the franchises', async () => {
    const getFranchisesRes = await request(app).get('/api/franchise');
    expect(getFranchisesRes.status).toBe(200);
});

test('get user franchises', async () => {
    const getFranchisesRes = await request(app).get(`/api/franchise/${testUserId}`).set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(getFranchisesRes.status).toBe(200);
});

test('create a store for a franchise', async () => {
    let nameOfNewFranchise = randomName();
    let franchiseRequest = {name: nameOfNewFranchise, admins: [{email: testUser.email}]};
    const franchiseCreationRes = await request(app).post('/api/franchise').send(franchiseRequest).set('Authorization', `Bearer ${adminUserAuthToken}`);
    franchiseId = franchiseCreationRes.body.id;

    let storeName = randomName();
    let storeRequest = {franchiseId: franchiseId, name: storeName};
    const createStoreRes = await request(app).post(`/api/franchise/${franchiseId}/store`).send(storeRequest).set('Authorization', `Bearer ${adminUserAuthToken}`);
    console.log(createStoreRes.body)
    expect(createStoreRes.status).toBe(200);

});

test('delete a franchise', async () => {
    const deleteFranchiseRes = await request(app).delete(`/api/franchise/${franchiseId}`).set('Authorization', `Bearer ${adminUserAuthToken}`);
    expect(deleteFranchiseRes.status).toBe(200);
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
  
//   async function createFranchiseeUser() {
//       let user = { password: 'toomanysecrets', roles: [{ role: Role.Franchisee }] };
//       user.name = randomName();
//       user.email = user.name + '@Franchisee.com';
    
//       user = await DB.addUser(user);
//       return { ...user, password: 'toomanysecrets' };
//     }