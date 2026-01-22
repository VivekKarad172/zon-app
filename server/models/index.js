const sequelize = require('../config/database');
const User = require('./User');
const DoorType = require('./DoorType');
const Design = require('./Design');
const Color = require('./Color');
const DesignColor = require('./DesignColor');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Post = require('./Post'); // NEW: What's New posts

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

// OrderItem relations (still keep FKs for active reference, but rely on snapshots for history)
OrderItem.belongsTo(Design, { foreignKey: 'designId' });
OrderItem.belongsTo(Color, { foreignKey: 'colorId' });

module.exports = {
    sequelize,
    User,
    DoorType,
    Design,
    Color,
    DesignColor,
    Order,
    OrderItem,
    Post  // NEW
};
