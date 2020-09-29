const path = require('path');
const express = require('express');
const xss = require('xss');
const NoteServices = require('../services/noteServices');

const noteRouter = express.Router();
const serializeNote = (note) => ({
  id: note.id,
  note_name: xss(note.note_name),
  description: xss(note.description),
  edit_date: note.edit_date,
  folder_id: note.folder_id
});

noteRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    NoteServices.getAllNotes(knexInstance)
      .then((notes) => {
        res.json(notes.map(serializeNote));
      })
      .catch(next);
  })
  .post((req, res, next) => {
    const { note_name, description, edit_date, folder_id } = req.body;
    const newNote = { note_name, description, edit_date, folder_id };

    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(newNote)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        });
      }
    }

    return NoteServices.insertNote(req.app.get('db'), newNote)
      .then((note) => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(serializeNote(note));
      })
      .catch(next);
  });

noteRouter
  .route('/:note_id')
  .all((req, res, next) => {
    NoteServices.getById(req.app.get('db'), req.params.note_id)
      .then((note) => {
        if (!note) {
          return res.status(404).json({
            error: { message: `note doesn't exist` }
          });
        }
        res.note = note;
        return next();
      })
      .catch(next);
  })
  .get((req, res) => {
    res.json(serializeNote(res.note));
  })
  .delete((req, res, next) => {
    NoteServices.deleteById(req.app.get('db'), req.params.note_id)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch((req, res, next) => {
    const { note_name, description, edit_date, folder_id } = req.body;
    const newNote = { note_name, description, edit_date, folder_id };

    const numberOfValues = Object.values(newNote).filter(Boolean).length;
    if (numberOfValues < 4)
      return res.status(400).json({
        error: {
          message: `Request body must contain either 'note_name', 'description', or 'edit_date'`
        }
      });

    return NoteServices.updateById(req.app.get('db'), req.params.note_id, newNote)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = noteRouter;
