const mongoose = require("mongoose");

const repairNoteSchema = new mongoose.Schema(
  {
    workOrderId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, required: true }, // mechanic's id from x-user-id
    type: { type: String, required: true, enum: ["finding", "work_done"] },
    text: { type: String, required: true, trim: true }, // "Front pads worn to 2 mm, replaced"
  },
  { timestamps: true }
);

module.exports = mongoose.model("RepairNote", repairNoteSchema);
