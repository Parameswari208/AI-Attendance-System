const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({


   mobile: String,
  gender: String,
  address: String,
  idProof: String,

  name: String,
  email: String,
  employeeId: String,
  faceDescriptor: [Number],
  loginCount: { type: Number, default: 0 },
  lastLogin: Date,
  loginHistory: [
    {
      loginTime: Date,
      pauseTime: [
        {
          start: Date,
          end: Date,
        }
      ],
      logoutTime: Date,
      totalWorked: Number,
    }
  ],
  isLoggedIn: {
  type: Boolean,
  default: false,
},
}, { timestamps: true });


module.exports = mongoose.model("User", UserSchema);