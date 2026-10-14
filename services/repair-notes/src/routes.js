const express = require("express");
const mongoose = require("mongoose");
const RepairNote = require("./model");
const { requireRole } = require("./middleware/user");

const router = express.Router();

const fail = (res, status, code, message) =>
  res.status(status).json({ error: { code, message } });

// Loads a note, or sends the 404 itself and returns null.
async function findNote(req, res) {
  const note = await RepairNote.findById(req.params.id);
  if (!note) {
    fail(res, 404, "NOT_FOUND", "No such note");
    return null;
  }
  return note;
}

const isAuthor = (note, req) => String(note.authorId) === req.user.id;

// POST /api/notes  (mechanic). authorId comes from the header, never the body.
router.post("/api/notes", requireRole("mechanic"), async (req, res) => {
  const { workOrderId, type, text } = req.body ?? {};
  if (!mongoose.isValidObjectId(workOrderId)) {
    return fail(res, 400, "VALIDATION_ERROR", "workOrderId is required and must be a valid id");
  }
  const note = await RepairNote.create({ workOrderId, authorId: req.user.id, type, text });
  res.status(201).json(note);
});

// GET /api/notes?workOrderId=  (mechanic, manager). The filter is required.
router.get("/api/notes", requireRole("mechanic", "manager"), async (req, res) => {
  const { workOrderId } = req.query;
  if (typeof workOrderId !== "string" || !mongoose.isValidObjectId(workOrderId)) {
    return fail(res, 400, "VALIDATION_ERROR", "workOrderId query parameter is required and must be a valid id");
  }
  res.json(await RepairNote.find({ workOrderId }).sort({ createdAt: 1 }));
});

// GET /api/notes/:id  (mechanic, manager)
router.get("/api/notes/:id", requireRole("mechanic", "manager"), async (req, res) => {
  const note = await findNote(req, res);
  if (note) res.json(note);
});

// PUT /api/notes/:id  (author only). Only type and text can change.
router.put("/api/notes/:id", requireRole("mechanic"), async (req, res) => {
  const note = await findNote(req, res);
  if (!note) return;
  if (!isAuthor(note, req)) return fail(res, 403, "FORBIDDEN", "You can only edit your own notes");

  const { type, text } = req.body ?? {};
  if (type !== undefined) note.type = type;
  if (text !== undefined) note.text = text;
  res.json(await note.save());
});

// DELETE /api/notes/:id  (author, manager)
router.delete("/api/notes/:id", requireRole("mechanic", "manager"), async (req, res) => {
  const note = await findNote(req, res);
  if (!note) return;
  if (req.user.role === "mechanic" && !isAuthor(note, req)) {
    return fail(res, 403, "FORBIDDEN", "You can only delete your own notes");
  }
  await note.deleteOne();
  res.status(204).end();
});

module.exports = router;
