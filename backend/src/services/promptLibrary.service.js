const PromptLibrary = require('../models/PromptLibrary.model');
const { AppError } = require('../utils/AppError');

function serialize(p) {
  const o = p.toObject ? p.toObject() : p;
  return {
    id: o._id.toString(),
    userId: o.userId.toString(),
    title: o.title,
    category: o.category,
    registryKey: o.registryKey,
    body: o.body,
    description: o.description,
    isFavorite: !!o.isFavorite,
    versions: o.versions || [],
    tags: o.tags || [],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

const SEED = [
  { title: 'Explain algorithm', category: 'Coding', registryKey: 'chat_dsa_mentor', body: 'Explain {{topic}} with complexity and examples.' },
  { title: 'Mock interview opener', category: 'Interview', registryKey: 'chat_interview_coach', body: 'Start a mock interview for {{role}}.' },
  { title: 'Resume bullet rewrite', category: 'Resume', registryKey: 'chat_career_mentor', body: 'Rewrite this resume bullet to be impact-focused:\n{{bullet}}' },
  { title: 'Career roadmap', category: 'Career', registryKey: 'chat_career_mentor', body: 'Build a 6-month roadmap for {{goal}}.' },
  { title: 'Design a system', category: 'System Design', registryKey: 'chat_system_design', body: 'Design {{system}} covering requirements, APIs, storage, and trade-offs.' },
  { title: 'Debug this error', category: 'Debugging', registryKey: 'chat_general', body: 'Help me debug:\n```\n{{error}}\n```' },
  { title: 'Architecture review', category: 'Architecture', registryKey: 'chat_backend_mentor', body: 'Review this architecture and suggest improvements:\n{{diagram}}' },
];

const promptLibraryService = {
  async list(userId, { category, q, favorites } = {}) {
    const filter = { userId };
    if (category) filter.category = category;
    if (favorites === 'true' || favorites === true) filter.isFavorite = true;
    if (q) filter.title = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    let items = await PromptLibrary.find(filter).sort({ isFavorite: -1, updatedAt: -1 }).lean();
    if (!items.length && !category && !q) {
      await PromptLibrary.insertMany(SEED.map((s) => ({ ...s, userId, versions: [{ version: '1.0.0', body: s.body }] })));
      items = await PromptLibrary.find({ userId }).sort({ updatedAt: -1 }).lean();
    }
    return { items: items.map(serialize), categories: SEED.map((s) => s.category).filter((v, i, a) => a.indexOf(v) === i) };
  },

  async create(userId, body) {
    const doc = await PromptLibrary.create({
      userId,
      title: body.title,
      category: body.category || 'Other',
      registryKey: body.registryKey || 'chat_general',
      body: body.body || '',
      description: body.description || '',
      tags: body.tags || [],
      isFavorite: !!body.isFavorite,
      versions: [{ version: '1.0.0', body: body.body || '' }],
    });
    return serialize(doc);
  },

  async update(userId, id, body) {
    const doc = await PromptLibrary.findOne({ _id: id, userId });
    if (!doc) throw new AppError('Prompt not found', 404);
    const prevBody = doc.body;
    for (const key of ['title', 'category', 'registryKey', 'body', 'description', 'tags', 'isFavorite']) {
      if (body[key] !== undefined) doc[key] = body[key];
    }
    if (body.body !== undefined && body.body !== prevBody) {
      const next = `${(doc.versions?.length || 0) + 1}.0.0`;
      doc.versions = [...(doc.versions || []), { version: next, body: body.body }];
    }
    await doc.save();
    return serialize(doc);
  },

  async remove(userId, id) {
    const doc = await PromptLibrary.findOne({ _id: id, userId });
    if (!doc) throw new AppError('Prompt not found', 404);
    await doc.deleteOne();
    return { deleted: true, id };
  },

  async duplicate(userId, id) {
    const source = await PromptLibrary.findOne({ _id: id, userId });
    if (!source) throw new AppError('Prompt not found', 404);
    const doc = await PromptLibrary.create({
      userId,
      title: `${source.title} (copy)`,
      category: source.category,
      registryKey: source.registryKey,
      body: source.body,
      description: source.description,
      tags: source.tags,
      versions: [{ version: '1.0.0', body: source.body }],
    });
    return serialize(doc);
  },

  async exportAll(userId) {
    const items = await PromptLibrary.find({ userId }).lean();
    return { exportedAt: new Date().toISOString(), prompts: items.map(serialize) };
  },

  async importMany(userId, payload) {
    const list = payload.prompts || payload || [];
    const created = [];
    for (const p of list) {
      const doc = await PromptLibrary.create({
        userId,
        title: p.title || 'Imported prompt',
        category: p.category || 'Other',
        registryKey: p.registryKey || 'chat_general',
        body: p.body || '',
        description: p.description || '',
        tags: p.tags || [],
        versions: [{ version: '1.0.0', body: p.body || '' }],
      });
      created.push(serialize(doc));
    }
    return { imported: created.length, items: created };
  },
};

module.exports = { promptLibraryService };
