const sequelize = require('../config/database');
const User = require('./User');
const DoorType = require('./DoorType');
const Design = require('./Design');
const Color = require('./Color');
const DesignColor = require('./DesignColor');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Post = require('./Post'); // NEW: What's New posts
const Worker = require('./Worker');
const ProductionUnit = require('./ProductionUnit');
const ProcessRecord = require('./ProcessRecord');

// User Associations
User.hasMany(User, { as: 'Dealers', foreignKey: 'distributorId' });
User.belongsTo(User, { as: 'Distributor', foreignKey: 'distributorId' });

User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });

// Association for Distributors to access all their dealers' orders directly
User.hasMany(Order, { as: 'DistributedOrders', foreignKey: 'distributorId' });
Order.belongsTo(User, { as: 'Distributor', foreignKey: 'distributorId' });

// DoorType has many Designs
DoorType.hasMany(Design, { foreignKey: 'doorTypeId' });
Design.belongsTo(DoorType, { foreignKey: 'doorTypeId' });

// V2: Design <-> Color Many-to-Many
Design.belongsToMany(Color, { through: DesignColor });
Color.belongsToMany(Design, { through: DesignColor });

// Order Associations
Order.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

// OrderItem relations
OrderItem.belongsTo(Design, { foreignKey: 'designId' });
OrderItem.belongsTo(Color, { foreignKey: 'colorId' });

// --- FACTORY SYSTEM V2 ---
// OrderItem -> ProductionUnits (1 OrderItem = quantity * Units)
OrderItem.hasMany(ProductionUnit, { foreignKey: 'orderItemId' });
ProductionUnit.belongsTo(OrderItem, { foreignKey: 'orderItemId' });

// ProductionUnit -> ProcessRecords (History)
ProductionUnit.hasMany(ProcessRecord, { foreignKey: 'productionUnitId' });
ProcessRecord.belongsTo(ProductionUnit, { foreignKey: 'productionUnitId' });

// Worker -> ProcessRecords
Worker.hasMany(ProcessRecord, { foreignKey: 'workerId' });
ProcessRecord.belongsTo(Worker, { foreignKey: 'workerId' });

module.exports = {
    sequelize,
    User,
    DoorType,
    Design,
    Color,
    DesignColor,
    Order,
    OrderItem,
    Post,
    Worker,
    ProductionUnit,
    ProcessRecord
};
