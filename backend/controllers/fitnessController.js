const Fitness = require('../models/Fitness')
const { createRecordController } = require('./recordControllerFactory')

module.exports = createRecordController({
  name: 'fitness',
  label: 'Fitness',
  Model: Fitness,
  expiryField: 'validTo',
  requiredDateField: 'validFrom',
  fyDateField: 'validFrom',
  expiringDays: 30,
  searchFields: ['vehicleNumber', 'ownerName', 'mobileNumber'],
  stringFields: ['vehicleNumber', 'ownerName', 'mobileNumber', 'partyId', 'workDate', 'validFrom', 'validTo', 'fitnessDocument'],
  uppercaseFields: ['vehicleNumber'],
  numberFields: ['totalFee', 'paid', 'balance'],
  arrayField: 'feeBreakup',
  documentField: 'fitnessDocument',
  documentDataField: 'fitnessDocumentData',
  totalField: 'totalFee',
  paidField: 'paid',
  balanceField: 'balance',
})
