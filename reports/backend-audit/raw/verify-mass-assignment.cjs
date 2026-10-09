// Offline verification (no DB): does User.findByIdAndUpdate(id, req.body) keep privileged fields?
// Schema fields copied from backend/src/models/User.ts and Product.ts
const mongoose = require(process.argv[2] || 'mongoose');
const { Schema } = mongoose;
const User = mongoose.model('U', new Schema({ name:String, email:String, password:String, role:{type:String,enum:['CUSTOMER','ADMIN'],default:'CUSTOMER'}, resetPasswordToken:String, wishlist:[Schema.Types.ObjectId] }, {timestamps:true}));
const body = { name:'x', role:'ADMIN', password:'plaintext', resetPasswordToken:'t', notInSchema:1 };
const q = User.findByIdAndUpdate(new mongoose.Types.ObjectId(), body, { new:true });
const cast = q._castUpdate(q._update); console.log('cast update Mongoose would send:', JSON.stringify(cast));
// orders.service stock deduction path
const Product = mongoose.model('P', new Schema({ size:String, quantity:Number }));
console.log("Product schema has 'variants' path:", !!Product.schema.path('variants'), "(orders.service.ts:~137 filters on 'variants.size')");
const q2 = Product.updateOne({_id:new mongoose.Types.ObjectId(),'variants.size':'M'},{$inc:{'variants.$.quantity':-1}});
try { console.log('stock update Mongoose would send:', JSON.stringify(q2._castUpdate(q2._update))); } catch(e){ console.log('stock update cast error:', e.message); }
// findOneAndUpdate does not validate enums by default
const O = mongoose.model('O', new Schema({status:{type:String,enum:['PENDING','SHIPPED']}}));
console.log('runValidators default for findOneAndUpdate:', O.findOneAndUpdate({}, {status:'BOGUS'}).getOptions().runValidators);
mongoose.disconnect();
