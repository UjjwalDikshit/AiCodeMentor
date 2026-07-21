const ChatTemplate = require('../models/ChatTemplate.model');
const { AppError } = require('../utils/AppError');

const SYSTEM_DEFAULTS = [
  {
    name: 'Resume Review',
    description: 'Coach for resume feedback',
    systemPrompt: 'chat_career_mentor',
    suggestions: ['Review my resume bullet points', 'Improve my summary section'],
    icon: 'file-text',
    color: '#0ea5e9',
  },
  {
    name: 'DSA Mentor',
    description: 'Algorithms and data structures',
    systemPrompt: 'chat_dsa_mentor',
    suggestions: ['Explain Segment Tree', 'Walk through binary search'],
    icon: 'binary',
    color: '#22c55e',
  },
  {
    name: 'System Design',
    description: 'Architecture and scalability',
    systemPrompt: 'chat_system_design',
    suggestions: ['Design a URL shortener', 'Explain caching strategies'],
    icon: 'network',
    color: '#a855f7',
  },
  {
    name: 'Backend Mentor',
    description: 'APIs, databases, services',
    systemPrompt: 'chat_backend_mentor',
    suggestions: ['Design REST auth flow', 'Explain indexes'],
    icon: 'server',
    color: '#f59e0b',
  },
  {
    name: 'Frontend Mentor',
    description: 'React and UI engineering',
    systemPrompt: 'chat_frontend_mentor',
    suggestions: ['Teach React Hooks', 'Review my component'],
    icon: 'layout',
    color: '#ef4444',
  },
  {
    name: 'Interview Coach',
    description: 'Mock interview practice',
    systemPrompt: 'chat_interview_coach',
    suggestions: ['Mock Interview', 'Behavioral: conflict story'],
    icon: 'mic',
    color: '#14b8a6',
  },
  {
    name: 'Career Guidance',
    description: 'Growth and leveling',
    systemPrompt: 'chat_career_mentor',
    suggestions: ['Plan my next 6 months', 'How to negotiate offer'],
    icon: 'briefcase',
    color: '#64748b',
  },
  {
    name: 'Behavioral Interview',
    description: 'STAR-style behavioral prep',
    systemPrompt: 'chat_interview_coach',
    suggestions: ['Tell me about a failure', 'Leadership example'],
    icon: 'users',
    color: '#ec4899',
  },
];

function serialize(t) {
  const o = t.toObject ? t.toObject() : t;
  return {
    id: o._id.toString(),
    userId: o.userId ? o.userId.toString() : null,
    name: o.name,
    description: o.description,
    systemPrompt: o.systemPrompt,
    memoryKind: o.memoryKind,
    temperature: o.temperature,
    provider: o.provider,
    model: o.model,
    suggestions: o.suggestions || [],
    color: o.color,
    icon: o.icon,
    isSystem: !!o.isSystem,
    isFavorite: !!o.isFavorite,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function ensureSystemTemplates() {
  for (const t of SYSTEM_DEFAULTS) {
    const exists = await ChatTemplate.findOne({ isSystem: true, name: t.name });
    if (!exists) {
      await ChatTemplate.create({ ...t, isSystem: true, userId: null });
    }
  }
}

const templateService = {
  async list(userId) {
    await ensureSystemTemplates();
    const items = await ChatTemplate.find({
      $or: [{ isSystem: true }, { userId }],
    })
      .sort({ isSystem: -1, name: 1 })
      .lean();
    return { items: items.map(serialize) };
  },

  async create(userId, body) {
    const doc = await ChatTemplate.create({
      userId,
      name: body.name,
      description: body.description || '',
      systemPrompt: body.systemPrompt || 'chat_general',
      memoryKind: body.memoryKind || 'window',
      temperature: body.temperature ?? 0.2,
      provider: body.provider || 'dummy',
      model: body.model || 'dummy-echo',
      suggestions: body.suggestions || [],
      color: body.color || '#6366f1',
      icon: body.icon || 'sparkles',
      isSystem: false,
      isFavorite: !!body.isFavorite,
    });
    return serialize(doc);
  },

  async update(userId, id, body) {
    const doc = await ChatTemplate.findOne({ _id: id, userId, isSystem: false });
    if (!doc) throw new AppError('Template not found', 404);
    for (const key of [
      'name',
      'description',
      'systemPrompt',
      'memoryKind',
      'temperature',
      'provider',
      'model',
      'suggestions',
      'color',
      'icon',
      'isFavorite',
    ]) {
      if (body[key] !== undefined) doc[key] = body[key];
    }
    await doc.save();
    return serialize(doc);
  },

  async remove(userId, id) {
    const doc = await ChatTemplate.findOne({ _id: id, userId, isSystem: false });
    if (!doc) throw new AppError('Template not found', 404);
    await doc.deleteOne();
    return { deleted: true, id };
  },

  async duplicate(userId, id) {
    const source = await ChatTemplate.findOne({
      _id: id,
      $or: [{ userId }, { isSystem: true }],
    });
    if (!source) throw new AppError('Template not found', 404);
    const doc = await ChatTemplate.create({
      userId,
      name: `${source.name} (copy)`,
      description: source.description,
      systemPrompt: source.systemPrompt,
      memoryKind: source.memoryKind,
      temperature: source.temperature,
      provider: source.provider,
      model: source.model,
      suggestions: source.suggestions,
      color: source.color,
      icon: source.icon,
      isSystem: false,
    });
    return serialize(doc);
  },
};

module.exports = { templateService };
