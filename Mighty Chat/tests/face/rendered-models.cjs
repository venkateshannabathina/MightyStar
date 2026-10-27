'use strict';
const {appearances}=require('../../Sources/catalog.js');
module.exports={models:['Lynae','Lucy','Rover (Female)'].map((name,index)=>{
 const item=appearances.find(row=>row.name===name&&!row.variant);
 return {id:['01','07','24'][index],name:item.name,assetPath:item.key};
})};
