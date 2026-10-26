import mongoose from "mongoose";
const reviewSchema=new mongoose.Schema({customerId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},entrepreneurId:{type:mongoose.Schema.Types.ObjectId,ref:"Entrepreneur",required:true},serviceId:{type:mongoose.Schema.Types.ObjectId,ref:"Service",required:true},requestId:{type:mongoose.Schema.Types.ObjectId,ref:"ServiceRequest",required:true,unique:true},rating:{type:Number,required:true,min:1,max:5},comment:{type:String,default:"",trim:true,maxlength:1000}},{timestamps:true});
export default mongoose.model("Review",reviewSchema);
