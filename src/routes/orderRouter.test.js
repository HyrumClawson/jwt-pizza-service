const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}


let testUserAuthToken;
let adminUserAuthToken;
let admin;
let testUser;

beforeAll(async () => {
  //restaurantOwner = createFranchiseeUser();
  admin = await createAdminUser();
  console.log(admin)
  testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  //is a login request
  //const franchiseeLoginRes =  await request(app).put('/api/auth').send(restaurantOwner);
  //login request for admin
  const adminLoginRes = await request(app).put('/api/auth').send(admin);
  adminUserAuthToken = adminLoginRes.body.token;
  console.log('admin token', adminUserAuthToken)
  //franchiseeUserAuthToken = franchiseeLoginRes.body.token;
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
  admin = createAdminUser();
  
  //create a menu item 
  //create a store
  //create a franchise
  //save them to global variables 
});


test('add item to the menu', async () => {
    let addRequest = { title: randomName(), description: "No topping, no sauce, just carbs", image:"pizza9.png", price: 0.0001 };
    let addItemRequest = await request(app).put('/api/order/menu').send(addRequest).set('Authorization', `Bearer ${adminUserAuthToken}`);
    expect(addItemRequest.status).toBe(200);
    
});

test('add item to the menu without proper role', async () => {
    //{ "title":"Student", "description": "No topping, no sauce, just carbs", "image":"pizza9.png", "price": 0.0001 }
    let addRequest = { "title":"Student", "description": "No topping, no sauce, just carbs", "image":"pizza9.png", "price": 0.0001 };
    const addItemRequest = await request(app).put('/api/order/menu').send(addRequest).set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(addItemRequest.status).toBe(403);
});



// test('faulty login', async () => {
//   testUser.password = "lasl;d;adksj";
//   const loginRes = await request(app).put('/api/auth').send(testUser);
//   expect(loginRes.status).toBe(404);
//   testUser.password = 'a';
// });



test('order', async () => {
  const menu = await request(app).get('/api/order/menu')
  expect(menu.body[0]).toMatchObject({"description": "A garden of delight",});

  //send: transmits body of the request
  //set : set the header 
  let orderRequest = {franchiseId : 1, storeId :1, items :[{ menuId: 1, description : "Veggie" , price : 0.05 }]};
  const orderRes = await request(app).post('/api/order').send(orderRequest).set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(orderRes.status).toBe(200);
  // expect(order.status).toBe(200);
  // expect(order.body).toBe("hello");
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
  user.franchiseId = 0;

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

// async function createFranchiseeUser() {
//     let user = { password: 'toomanysecrets', roles: [{ role: Role.Franchisee }] };
//     user.name = randomName();
//     user.email = user.name + '@Franchisee.com';
//     user.franchiseId = 0;
//     user = await DB.addUser(user);
//     return { ...user, password: 'toomanysecrets' };
//   }