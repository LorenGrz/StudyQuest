# Party Chat Rich Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real support for GitHub issues `#34` and `#35` by enabling party chat voice notes and file/PDF attachments with persisted metadata, realtime delivery, and a usable frontend composer.

**Architecture:** Keep plain text messages working, but evolve the party chat domain to a single rich-message model with explicit `type`. Text messages keep their current websocket send flow. Binary payloads (PDF/files/audio) are uploaded through authenticated REST `multipart/form-data` endpoints, persisted as chat messages, and then broadcast to the party room through the existing Socket.IO gateway via event emitter.

**Tech Stack:** NestJS 11, TypeORM, PostgreSQL, Multer, Socket.IO, React 19, TypeScript, Vite 8, Zustand, Axios, Vitest, Testing Library

---

## File Structure

### Backend files to modify

- `backend/src/modules/parties/chat-message.entity.ts`
  Responsibility: persist richer chat message metadata for text, file, and audio messages.
- `backend/src/common/dto/index.ts`
  Responsibility: validate text payloads and new upload metadata payloads.
- `backend/src/modules/parties/parties.service.ts`
  Responsibility: create rich messages, validate party membership, fetch history in a frontend-safe shape.
- `backend/src/modules/parties/parties.controller.ts`
  Responsibility: expose new REST endpoints for file and audio uploads.
- `backend/src/gateways/matchmaking/matchmaking.gateway.ts`
  Responsibility: keep websocket text send path and broadcast persisted binary messages through event events.
- `backend/src/main.ts`
  Responsibility: serve `/uploads/*` statically so uploaded chat attachments and audio can be opened by clients.
- `backend/package.json`
  Responsibility: add any backend-only test or utility scripts if needed.

### Backend files to create

- `backend/src/modules/parties/chat-message.types.ts`
  Responsibility: canonical message type union and helper constants.
- `backend/src/modules/parties/chat-message.presenter.ts`
  Responsibility: normalize entity -> API/socket response mapping in one place.
- `backend/test/parties-chat.e2e-spec.ts`
  Responsibility: cover binary upload endpoints and rich chat history contract.
- `backend/src/modules/parties/parties.service.spec.ts`
  Responsibility: unit-test message creation rules and history mapping.

### Frontend files to modify

- `frontend/package.json`
  Responsibility: add test tooling for the new UI behavior.
- `frontend/vite.config.ts`
  Responsibility: configure Vitest + jsdom.
- `frontend/src/services/partyService.ts`
  Responsibility: define rich `ChatMessage` types and add upload APIs.
- `frontend/src/hooks/useParty.ts`
  Responsibility: maintain rich messages, send text, upload binary content, and receive realtime updates.
- `frontend/src/components/PartyComponents.tsx`
  Responsibility: wire the room page to the new chat UI if the chat stays in this file.
- `frontend/src/index.css`
  Responsibility: styles for attachment cards, audio player, upload controls, recording states, and errors.

### Frontend files to create

- `frontend/src/components/party-chat/ChatComposer.tsx`
  Responsibility: text input, file attach, voice record lifecycle, validation, and submit controls.
- `frontend/src/components/party-chat/ChatMessageItem.tsx`
  Responsibility: render text/file/audio messages based on `type`.
- `frontend/src/components/party-chat/ChatBox.tsx`
  Responsibility: list rendering + scroll behavior + composer integration.
- `frontend/src/components/party-chat/chatMessageGuards.ts`
  Responsibility: small helpers like `isAudioMessage`, `isFileMessage`, `formatBytes`.
- `frontend/src/components/party-chat/ChatComposer.test.tsx`
  Responsibility: validate file/audio UI behavior.
- `frontend/src/components/party-chat/ChatMessageItem.test.tsx`
  Responsibility: validate rendering of text/file/audio cards.
- `frontend/src/test/setup.ts`
  Responsibility: shared Vitest setup.

## Non-goals

- live streaming voice chat
- waveform visualization
- upload progress bars
- arbitrary image preview gallery
- backend transcoding or speech-to-text

## Canonical data contract

All chat messages should converge to this shape before they leave the backend:

```ts
export type ChatMessageType = 'text' | 'file' | 'audio'

export interface ChatAttachment {
  url: string
  name: string
  mimeType: string
  sizeBytes: number
  durationMs?: number | null
}

export interface ChatMessageResponse {
  id: string
  type: ChatMessageType
  text: string | null
  userId: string
  user?: {
    id: string
    username: string
    displayName: string
    avatarUrl?: string | null
  }
  attachment: ChatAttachment | null
  createdAt: string
}
```

Rules:

- `text` messages: `text` is non-null, `attachment` is `null`
- `file` messages: `text` may be optional caption or `null`, `attachment.durationMs` is `null`
- `audio` messages: `attachment.mimeType` must be audio, `attachment.durationMs` is required from the client payload

## Validation decisions

- file attachments allowed for `application/pdf`, `text/plain`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- file attachments max size: `10 MB`
- audio attachments allowed for `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/mpeg`
- audio attachments max size: `5 MB`
- audio duration max: `120000 ms`
- captions remain out of scope for the first pass except a nullable `text` field already supported by the contract

## Task 1: Introduce the rich chat message backend contract

**Files:**
- Create: `backend/src/modules/parties/chat-message.types.ts`
- Create: `backend/src/modules/parties/chat-message.presenter.ts`
- Create: `backend/src/modules/parties/parties.service.spec.ts`
- Modify: `backend/src/modules/parties/chat-message.entity.ts`
- Modify: `backend/src/common/dto/index.ts`
- Modify: `backend/src/modules/parties/parties.service.ts`

- [ ] **Step 1: Write the failing backend unit tests**

Add `backend/src/modules/parties/parties.service.spec.ts` with:

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository, DataSource } from 'typeorm';
import { PartiesService } from './parties.service';
import { Party } from './party.entity';
import { PartyMember } from './party-member.entity';
import { ChatMessage } from './chat-message.entity';
import { PartyActivity } from './party-activity.entity';
import { User } from '../users/user.entity';

describe('PartiesService rich chat messages', () => {
  let service: PartiesService;
  let chatRepo: jest.Mocked<Repository<ChatMessage>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PartiesService,
        { provide: getRepositoryToken(Party), useValue: {} },
        { provide: getRepositoryToken(PartyMember), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(ChatMessage), useValue: {
          create: jest.fn(),
          save: jest.fn(),
          findOne: jest.fn(),
          find: jest.fn(),
        } },
        { provide: getRepositoryToken(PartyActivity), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(PartiesService);
    chatRepo = moduleRef.get(getRepositoryToken(ChatMessage));
  });

  it('creates a text message with null attachment metadata', async () => {
    chatRepo.create.mockReturnValue({ type: 'text', text: 'hola' } as ChatMessage);
    chatRepo.save.mockResolvedValue({ id: 'm1' } as ChatMessage);
    chatRepo.findOne.mockResolvedValue({
      id: 'm1',
      type: 'text',
      text: 'hola',
      attachmentUrl: null,
      attachmentName: null,
      attachmentMimeType: null,
      attachmentSizeBytes: null,
      attachmentDurationMs: null,
      userId: 'u1',
      createdAt: new Date('2026-05-16T12:00:00.000Z'),
      user: {
        id: 'u1',
        username: 'lgrz',
        displayName: 'Loren',
        avatarUrl: null,
      } as User,
    } as ChatMessage);

    const result = await service.addTextChatMessage('party-1', 'u1', 'hola');

    expect(result.type).toBe('text');
    expect(result.attachment).toBeNull();
    expect(result.text).toBe('hola');
  });

  it('creates an audio message with attachment metadata', async () => {
    chatRepo.create.mockReturnValue({ type: 'audio' } as ChatMessage);
    chatRepo.save.mockResolvedValue({ id: 'm2' } as ChatMessage);
    chatRepo.findOne.mockResolvedValue({
      id: 'm2',
      type: 'audio',
      text: null,
      attachmentUrl: '/uploads/audio-1.webm',
      attachmentName: 'audio-1.webm',
      attachmentMimeType: 'audio/webm',
      attachmentSizeBytes: 2048,
      attachmentDurationMs: 9000,
      userId: 'u1',
      createdAt: new Date('2026-05-16T12:01:00.000Z'),
      user: {
        id: 'u1',
        username: 'lgrz',
        displayName: 'Loren',
        avatarUrl: null,
      } as User,
    } as ChatMessage);

    const result = await service.addBinaryChatMessage('party-1', 'u1', {
      type: 'audio',
      url: '/uploads/audio-1.webm',
      name: 'audio-1.webm',
      mimeType: 'audio/webm',
      sizeBytes: 2048,
      durationMs: 9000,
    });

    expect(result.type).toBe('audio');
    expect(result.attachment?.durationMs).toBe(9000);
    expect(result.attachment?.mimeType).toBe('audio/webm');
  });
});
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run:

```bash
cd backend
npm run test -- parties.service.spec.ts
```

Expected:

```text
FAIL src/modules/parties/parties.service.spec.ts
Property 'addTextChatMessage' does not exist on type 'PartiesService'
```

- [ ] **Step 3: Implement the new backend message contract**

Create `backend/src/modules/parties/chat-message.types.ts`:

```ts
export const CHAT_MESSAGE_TYPES = ['text', 'file', 'audio'] as const;

export type ChatMessageType = typeof CHAT_MESSAGE_TYPES[number];

export interface ChatAttachmentPayload {
  url: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  durationMs?: number | null;
}
```

Create `backend/src/modules/parties/chat-message.presenter.ts`:

```ts
import { ChatMessage } from './chat-message.entity';

export function presentChatMessage(message: ChatMessage) {
  return {
    id: message.id,
    type: message.type,
    text: message.text,
    userId: message.userId,
    user: message.user
      ? {
          id: message.user.id,
          username: message.user.username,
          displayName: message.user.displayName,
          avatarUrl: message.user.avatarUrl,
        }
      : undefined,
    attachment: message.attachmentUrl
      ? {
          url: message.attachmentUrl,
          name: message.attachmentName!,
          mimeType: message.attachmentMimeType!,
          sizeBytes: message.attachmentSizeBytes!,
          durationMs: message.attachmentDurationMs,
        }
      : null,
    createdAt:
      message.createdAt instanceof Date
        ? message.createdAt.toISOString()
        : message.createdAt,
  };
}
```

Update `backend/src/modules/parties/chat-message.entity.ts`:

```ts
@Column({ type: 'varchar', length: 16, default: 'text' })
type: 'text' | 'file' | 'audio';

@Column({ type: 'text', nullable: true })
text: string | null;

@Column({ name: 'attachment_url', type: 'text', nullable: true })
attachmentUrl: string | null;

@Column({ name: 'attachment_name', type: 'text', nullable: true })
attachmentName: string | null;

@Column({ name: 'attachment_mime_type', type: 'text', nullable: true })
attachmentMimeType: string | null;

@Column({ name: 'attachment_size_bytes', type: 'int', nullable: true })
attachmentSizeBytes: number | null;

@Column({ name: 'attachment_duration_ms', type: 'int', nullable: true })
attachmentDurationMs: number | null;
```

Update `backend/src/common/dto/index.ts`:

```ts
export class SendChatMessageDto {
  @IsString() @MinLength(1) @MaxLength(2000) text: string;
}

export class UploadAudioMessageDto {
  @IsNumber() @Min(1) @Max(120000) durationMs: number;
}
```

Update `backend/src/modules/parties/parties.service.ts` with explicit rich-message methods:

```ts
async addTextChatMessage(partyId: string, userId: string, text: string) {
  const msg = this.chatRepo.create({
    partyId,
    userId,
    type: 'text',
    text: text.trim(),
    attachmentUrl: null,
    attachmentName: null,
    attachmentMimeType: null,
    attachmentSizeBytes: null,
    attachmentDurationMs: null,
  });
  const saved = await this.chatRepo.save(msg);
  const full = await this.chatRepo.findOne({
    where: { id: saved.id },
    relations: ['user'],
  });
  return presentChatMessage(full as ChatMessage);
}

async addBinaryChatMessage(
  partyId: string,
  userId: string,
  attachment: ChatAttachmentPayload & { type: 'file' | 'audio' },
) {
  const msg = this.chatRepo.create({
    partyId,
    userId,
    type: attachment.type,
    text: null,
    attachmentUrl: attachment.url,
    attachmentName: attachment.name,
    attachmentMimeType: attachment.mimeType,
    attachmentSizeBytes: attachment.sizeBytes,
    attachmentDurationMs: attachment.durationMs ?? null,
  });
  const saved = await this.chatRepo.save(msg);
  const full = await this.chatRepo.findOne({
    where: { id: saved.id },
    relations: ['user'],
  });
  return presentChatMessage(full as ChatMessage);
}
```

Also update `getChatHistory()` to `return msgs.map(presentChatMessage);`.

- [ ] **Step 4: Run the unit test to verify it passes**

Run:

```bash
cd backend
npm run test -- parties.service.spec.ts
```

Expected:

```text
PASS src/modules/parties/parties.service.spec.ts
2 passed
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/parties/chat-message.types.ts \
        backend/src/modules/parties/chat-message.presenter.ts \
        backend/src/modules/parties/chat-message.entity.ts \
        backend/src/common/dto/index.ts \
        backend/src/modules/parties/parties.service.ts \
        backend/src/modules/parties/parties.service.spec.ts
git commit -m "feat: add rich party chat message model"
```

## Task 2: Add upload endpoints, static file serving, and realtime broadcasts

**Files:**
- Create: `backend/test/parties-chat.e2e-spec.ts`
- Modify: `backend/src/modules/parties/parties.controller.ts`
- Modify: `backend/src/modules/parties/parties.service.ts`
- Modify: `backend/src/gateways/matchmaking/matchmaking.gateway.ts`
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Write the failing e2e tests for file and audio uploads**

Add `backend/test/parties-chat.e2e-spec.ts` with:

```ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Party chat uploads (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects audio messages longer than 120 seconds', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/parties/party-1/chat/audio')
      .set('Authorization', 'Bearer test-token')
      .field('durationMs', '121000')
      .attach('file', Buffer.from('audio'), {
        filename: 'voice.webm',
        contentType: 'audio/webm',
      })
      .expect(400);
  });
});
```

- [ ] **Step 2: Run the e2e test to verify it fails**

Run:

```bash
cd backend
npm run test:e2e -- parties-chat.e2e-spec.ts
```

Expected:

```text
FAIL test/parties-chat.e2e-spec.ts
Cannot POST /api/v1/parties/party-1/chat/audio
```

- [ ] **Step 3: Implement binary upload flow and socket broadcast**

Update `backend/src/modules/parties/parties.controller.ts`:

```ts
import {
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Post(':id/chat/file')
@UseInterceptors(FileInterceptor('file'))
uploadChatFile(
  @Param('id') id: string,
  @Request() req: any,
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new FileTypeValidator({
          fileType:
            /(application\/pdf|text\/plain|application\/msword|application\/vnd.openxmlformats-officedocument.wordprocessingml.document)/,
        }),
        new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
      ],
    }),
  )
  file: Express.Multer.File,
) {
  return this.partiesService.addBinaryChatMessage(id, req.user.userId, {
    type: 'file',
    url: `/uploads/${file.filename}`,
    name: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
  });
}

@Post(':id/chat/audio')
@UseInterceptors(FileInterceptor('file'))
uploadChatAudio(
  @Param('id') id: string,
  @Request() req: any,
  @Body() dto: UploadAudioMessageDto,
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new FileTypeValidator({ fileType: /(audio\/webm|audio\/ogg|audio\/mp4|audio\/mpeg)/ }),
        new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
      ],
    }),
  )
  file: Express.Multer.File,
) {
  return this.partiesService.addBinaryChatMessage(id, req.user.userId, {
    type: 'audio',
    url: `/uploads/${file.filename}`,
    name: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    durationMs: dto.durationMs,
  });
}
```

Update `backend/src/modules/parties/parties.service.ts` so `addBinaryChatMessage()` emits a dedicated event:

```ts
const response = presentChatMessage(full as ChatMessage);
this.eventEmitter.emit('party.chat_message', { partyId, message: response });
return response;
```

Update `backend/src/gateways/matchmaking/matchmaking.gateway.ts`:

```ts
@SubscribeMessage('party:chat')
async handleChat(
  @ConnectedSocket() socket: Socket,
  @MessageBody() dto: SendChatMessageDto & { partyId: string },
) {
  const conn = this.connections.get(socket.id);
  if (!conn) return;
  const message = await this.partiesService.addTextChatMessage(
    dto.partyId,
    conn.userId,
    dto.text,
  );
  this.server.to(dto.partyId).emit('chat:message', message);
}

@OnEvent('party.chat_message')
handleChatMessageCreated(payload: { partyId: string; message: any }) {
  this.server.to(payload.partyId).emit('chat:message', payload.message);
}
```

Update `backend/src/main.ts` to serve uploaded files:

```ts
import { join } from 'path';
import express from 'express';

app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
```

- [ ] **Step 4: Run the focused test suite**

Run:

```bash
cd backend
npm run test -- parties.service.spec.ts
npm run test:e2e -- parties-chat.e2e-spec.ts
```

Expected:

```text
PASS src/modules/parties/parties.service.spec.ts
PASS test/parties-chat.e2e-spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/parties/parties.controller.ts \
        backend/src/modules/parties/parties.service.ts \
        backend/src/gateways/matchmaking/matchmaking.gateway.ts \
        backend/src/main.ts \
        backend/test/parties-chat.e2e-spec.ts
git commit -m "feat: add party chat file and audio upload endpoints"
```

## Task 3: Add frontend test tooling and rich chat service APIs

**Files:**
- Create: `frontend/src/test/setup.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/services/partyService.ts`
- Modify: `frontend/src/hooks/useParty.ts`

- [ ] **Step 1: Add the failing frontend component tests**

Create `frontend/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Create `frontend/src/components/party-chat/ChatMessageItem.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react'
import { ChatMessageItem } from './ChatMessageItem'

describe('ChatMessageItem', () => {
  it('renders a downloadable PDF attachment', () => {
    render(
      <ChatMessageItem
        message={{
          id: 'm1',
          type: 'file',
          text: null,
          userId: 'u1',
          createdAt: '2026-05-16T12:00:00.000Z',
          attachment: {
            url: '/uploads/guide.pdf',
            name: 'guide.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 4096,
          },
          user: { id: 'u1', username: 'loren', displayName: 'Loren', avatarUrl: null },
        }}
        isOwn={false}
      />,
    )

    expect(screen.getByRole('link', { name: /guide\.pdf/i })).toHaveAttribute('href', '/uploads/guide.pdf')
  })
})
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run:

```bash
cd frontend
npm run test -- ChatMessageItem.test.tsx
```

Expected:

```text
npm ERR! Missing script: "test"
```

- [ ] **Step 3: Add frontend test tooling and service contracts**

Update `frontend/package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^26.1.0",
    "vitest": "^3.2.4"
  }
}
```

Update `frontend/vite.config.ts`:

```ts
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
})
```

Update `frontend/src/services/partyService.ts`:

```ts
export type ChatMessageType = 'text' | 'file' | 'audio'

export interface ChatAttachment {
  url: string
  name: string
  mimeType: string
  sizeBytes: number
  durationMs?: number | null
}

export interface ChatMessage {
  id: string
  type: ChatMessageType
  text: string | null
  userId: string
  user?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>
  attachment: ChatAttachment | null
  createdAt: string
}

async uploadFileMessage(partyId: string, file: File): Promise<ChatMessage> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<ChatMessage>(`/parties/${partyId}/chat/file`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

async uploadAudioMessage(partyId: string, file: File, durationMs: number): Promise<ChatMessage> {
  const form = new FormData()
  form.append('file', file)
  form.append('durationMs', String(durationMs))
  const { data } = await api.post<ChatMessage>(`/parties/${partyId}/chat/audio`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
```

Update `frontend/src/hooks/useParty.ts`:

```ts
const sendTextMessage = useCallback((text: string) => {
  if (!socket.connected) return;
  socket.emit('party:chat', { partyId, text });
}, [partyId, socket]);

const sendFileMessage = useCallback(async (file: File) => {
  const message = await partyService.uploadFileMessage(partyId, file);
  setMessages((prev) => [...prev, message]);
}, [partyId]);

const sendAudioMessage = useCallback(async (file: File, durationMs: number) => {
  const message = await partyService.uploadAudioMessage(partyId, file, durationMs);
  setMessages((prev) => [...prev, message]);
}, [partyId]);
```

Important implementation note: once realtime broadcasting is working, remove the local `setMessages([...prev, message])` from binary uploads if it causes duplicates. The steady-state contract is “REST persists, socket fan-outs, UI appends only once.”

- [ ] **Step 4: Run frontend tests and build**

Run:

```bash
cd frontend
npm install
npm run test -- ChatMessageItem.test.tsx
npm run build
```

Expected:

```text
PASS src/components/party-chat/ChatMessageItem.test.tsx
vite v8 ...
✓ built in ...
```

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json \
        frontend/vite.config.ts \
        frontend/src/test/setup.ts \
        frontend/src/services/partyService.ts \
        frontend/src/hooks/useParty.ts \
        frontend/package-lock.json
git commit -m "test: add frontend chat test harness and rich message APIs"
```

## Task 4: Build the chat composer for text, file attachments, and voice notes

**Files:**
- Create: `frontend/src/components/party-chat/ChatComposer.tsx`
- Create: `frontend/src/components/party-chat/ChatComposer.test.tsx`
- Create: `frontend/src/components/party-chat/chatMessageGuards.ts`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Write the failing composer tests**

Create `frontend/src/components/party-chat/ChatComposer.test.tsx` with:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { ChatComposer } from './ChatComposer'

describe('ChatComposer', () => {
  it('shows a validation error for unsupported file types', async () => {
    render(
      <ChatComposer
        onSendText={vi.fn()}
        onSendFile={vi.fn()}
        onSendAudio={vi.fn()}
      />,
    )

    const input = screen.getByLabelText(/adjuntar archivo/i)
    const file = new File(['x'], 'image.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText(/solo pdf, txt, doc o docx/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the composer test to verify it fails**

Run:

```bash
cd frontend
npm run test -- ChatComposer.test.tsx
```

Expected:

```text
FAIL src/components/party-chat/ChatComposer.test.tsx
Cannot find module './ChatComposer'
```

- [ ] **Step 3: Implement the composer and recording flow**

Create `frontend/src/components/party-chat/chatMessageGuards.ts`:

```ts
import type { ChatMessage } from '../../services/partyService'

export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export function isAllowedChatFile(file: File) {
  return [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ].includes(file.type)
}

export function isAudioMessage(message: ChatMessage) {
  return message.type === 'audio' && !!message.attachment
}
```

Create `frontend/src/components/party-chat/ChatComposer.tsx`:

```tsx
import { useRef, useState } from 'react'
import { Button } from '../UI'
import { isAllowedChatFile } from './chatMessageGuards'

type Props = {
  onSendText: (text: string) => void
  onSendFile: (file: File) => Promise<void>
  onSendAudio: (file: File, durationMs: number) => Promise<void>
}

export function ChatComposer({ onSendText, onSendFile, onSendAudio }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef<number | null>(null)

  const submitText = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    onSendText(text.trim())
    setText('')
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    if (!isAllowedChatFile(file)) {
      setError('Solo PDF, TXT, DOC o DOCX')
      return
    }
    setError(null)
    await onSendFile(file)
  }

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    chunksRef.current = []
    startedAtRef.current = Date.now()
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = async () => {
      const durationMs = Date.now() - (startedAtRef.current ?? Date.now())
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
      await onSendAudio(file, durationMs)
      stream.getTracks().forEach((track) => track.stop())
    }
    mediaRecorderRef.current = recorder
    recorder.start()
    setIsRecording(true)
  }

  const stopRecording = async () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  return (
    <div className="chat-composer">
      <form className="chat-input-row" onSubmit={submitText}>
        <input
          className="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribí un mensaje..."
        />
        <label className="chat-attach-btn" aria-label="Adjuntar archivo">
          <input
            hidden
            type="file"
            accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          Adjuntar
        </label>
        <Button type="button" size="sm" onClick={() => void (isRecording ? stopRecording() : startRecording())}>
          {isRecording ? 'Detener audio' : 'Grabar audio'}
        </Button>
        <Button type="submit" size="sm">Enviar</Button>
      </form>
      {error && <p className="chat-error">{error}</p>}
    </div>
  )
}
```

Update `frontend/src/index.css` with:

```css
.chat-composer { border-top: 1px solid var(--border); padding: 12px 16px; }
.chat-attach-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 96px; cursor: pointer; }
.chat-error { margin: 8px 0 0; font-size: 12px; color: #f87171; }
.chat-attachment-card { display: flex; flex-direction: column; gap: 6px; }
.chat-audio-player { width: 100%; margin-top: 6px; }
```

- [ ] **Step 4: Run the composer tests**

Run:

```bash
cd frontend
npm run test -- ChatComposer.test.tsx
```

Expected:

```text
PASS src/components/party-chat/ChatComposer.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/party-chat/ChatComposer.tsx \
        frontend/src/components/party-chat/ChatComposer.test.tsx \
        frontend/src/components/party-chat/chatMessageGuards.ts \
        frontend/src/index.css
git commit -m "feat: add party chat composer for file and audio messages"
```

## Task 5: Render rich messages in the party room and integrate the new composer

**Files:**
- Create: `frontend/src/components/party-chat/ChatMessageItem.tsx`
- Create: `frontend/src/components/party-chat/ChatBox.tsx`
- Modify: `frontend/src/pages/PartyRoomPage.tsx`
- Modify: `frontend/src/components/PartyComponents.tsx`

- [ ] **Step 1: Write the failing UI rendering test**

Extend `frontend/src/components/party-chat/ChatMessageItem.test.tsx` with:

```tsx
it('renders an audio player for audio messages', () => {
  render(
    <ChatMessageItem
      message={{
        id: 'm2',
        type: 'audio',
        text: null,
        userId: 'u1',
        createdAt: '2026-05-16T12:10:00.000Z',
        attachment: {
          url: '/uploads/voice.webm',
          name: 'voice.webm',
          mimeType: 'audio/webm',
          sizeBytes: 2048,
          durationMs: 9000,
        },
        user: { id: 'u1', username: 'loren', displayName: 'Loren', avatarUrl: null },
      }}
      isOwn
    />,
  )

  expect(screen.getByRole('audio')).toBeInTheDocument()
})
```

Note for implementation: if the browser test environment does not expose an `audio` role, use `container.querySelector('audio')` instead of `getByRole`.

- [ ] **Step 2: Run the rendering test to verify it fails**

Run:

```bash
cd frontend
npm run test -- ChatMessageItem.test.tsx
```

Expected:

```text
FAIL src/components/party-chat/ChatMessageItem.test.tsx
ChatMessageItem is not defined
```

- [ ] **Step 3: Implement message rendering and room integration**

Create `frontend/src/components/party-chat/ChatMessageItem.tsx`:

```tsx
import type { ChatMessage } from '../../services/partyService'
import { formatBytes, isAudioMessage } from './chatMessageGuards'

export function ChatMessageItem({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <div className={`chat-message${isOwn ? ' chat-message-own' : ''}`}>
      {!isOwn && (
        <span className="chat-username">
          {message.user?.displayName ?? message.userId.slice(0, 8)}
        </span>
      )}

      {message.type === 'text' && message.text && (
        <p className="chat-text">{message.text}</p>
      )}

      {message.type === 'file' && message.attachment && (
        <div className="chat-attachment-card">
          <a href={message.attachment.url} target="_blank" rel="noreferrer">
            {message.attachment.name}
          </a>
          <span className="chat-time">
            {message.attachment.mimeType} · {formatBytes(message.attachment.sizeBytes)}
          </span>
        </div>
      )}

      {isAudioMessage(message) && message.attachment && (
        <div className="chat-attachment-card">
          <audio className="chat-audio-player" controls src={message.attachment.url} />
          <span className="chat-time">
            {(message.attachment.durationMs ?? 0) / 1000}s · {formatBytes(message.attachment.sizeBytes)}
          </span>
        </div>
      )}

      <span className="chat-time">
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}
```

Create `frontend/src/components/party-chat/ChatBox.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../../services/partyService'
import { ChatComposer } from './ChatComposer'
import { ChatMessageItem } from './ChatMessageItem'

type Props = {
  messages: ChatMessage[]
  currentUserId?: string
  onSendText: (text: string) => void
  onSendFile: (file: File) => Promise<void>
  onSendAudio: (file: File, durationMs: number) => Promise<void>
}

export function ChatBox({ messages, currentUserId = '', onSendText, onSendFile, onSendAudio }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty"><p>Sin mensajes todavía. ¡Sé el primero! 💬</p></div>
        ) : (
          messages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              isOwn={Boolean(currentUserId) && message.userId === currentUserId}
            />
          ))
        )}
        <div ref={endRef} />
      </div>
      <ChatComposer
        onSendText={onSendText}
        onSendFile={onSendFile}
        onSendAudio={onSendAudio}
      />
    </div>
  )
}
```

Update `frontend/src/pages/PartyRoomPage.tsx`:

```tsx
const {
  party,
  setParty,
  messages,
  sendTextMessage,
  sendFileMessage,
  sendAudioMessage,
  isLoading,
  currentUserId,
} = useParty(partyId ?? '')
```

Replace the old chat render with:

```tsx
<ChatBox
  messages={messages}
  onSendText={sendTextMessage}
  onSendFile={sendFileMessage}
  onSendAudio={sendAudioMessage}
  currentUserId={currentUserId}
/>
```

If `frontend/src/components/PartyComponents.tsx` still exports the old `ChatBox`, either:

- remove that export and re-export the new chat box from `party-chat/ChatBox.tsx`, or
- keep `PartyComponents.tsx` as a barrel file:

```ts
export { ChatBox } from './party-chat/ChatBox'
```

- [ ] **Step 4: Run tests, lint, and production build**

Run:

```bash
cd frontend
npm run test -- ChatMessageItem.test.tsx ChatComposer.test.tsx
npm run lint
npm run build
```

Expected:

```text
PASS src/components/party-chat/ChatMessageItem.test.tsx
PASS src/components/party-chat/ChatComposer.test.tsx
0 errors
✓ built in ...
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/party-chat/ChatMessageItem.tsx \
        frontend/src/components/party-chat/ChatBox.tsx \
        frontend/src/pages/PartyRoomPage.tsx \
        frontend/src/components/PartyComponents.tsx
git commit -m "feat: render file and audio messages in party chat"
```

## Task 6: End-to-end verification and documentation sync

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Document the new capability before final verification**

Update `README.md` chat-related sections with:

```md
- Party chat now supports:
  - text messages
  - PDF/TXT/DOC/DOCX attachments
  - voice notes recorded in-browser and played back inline
```

Update `AGENTS.md` by replacing the old known-gap note with:

```md
GitHub issues #34 and #35 are implemented through the rich chat message model.
Party chat now supports text, file/PDF attachments, and voice notes.
Binary messages are uploaded via REST and broadcast to the room through Socket.IO.
```

- [ ] **Step 2: Run final verification commands**

Run:

```bash
cd backend
npm run test -- parties.service.spec.ts
npm run test:e2e -- parties-chat.e2e-spec.ts

cd ../frontend
npm run test
npm run lint
npm run build
```

Expected:

```text
PASS src/modules/parties/parties.service.spec.ts
PASS test/parties-chat.e2e-spec.ts
PASS all frontend chat tests
0 frontend lint errors
✓ frontend build completed
```

- [ ] **Step 3: Perform manual browser QA**

Run the app:

```bash
docker compose up -d postgres redis
cd backend && npm run start:dev
cd ../frontend && npm run dev
```

Manual checks:

- log in with two browser sessions
- join the same party in both sessions
- send a text message from session A and confirm live delivery in session B
- upload a PDF from session A and confirm a clickable link appears in both sessions
- record a short voice note from session B and confirm inline playback in both sessions
- refresh the room and confirm history reload includes text, file, and audio messages
- open uploaded file URLs directly and confirm they are served by the backend

- [ ] **Step 4: Commit the verification-safe docs update**

```bash
git add README.md AGENTS.md
git commit -m "docs: update chat capabilities and agent context"
```

## Spec coverage self-check

- Issue `#34` coverage:
  - recording UI: Task 4
  - audio upload endpoint: Task 2
  - audio persistence + metadata: Task 1
  - audio playback in room/history: Task 5
- Issue `#35` coverage:
  - file upload endpoint: Task 2
  - persisted attachment metadata: Task 1
  - clickable file rendering in room/history: Task 5
  - backend static serving for uploaded assets: Task 2

## Risk watchlist during implementation

- `useParty()` currently appends local messages on fallback paths; avoid double-insert once socket fan-out is active for binary uploads.
- `backend/src/main.ts` currently does not expose `/uploads`; without that, attachment history will persist but not open.
- `TYPEORM_SYNC=true` may handle new nullable columns in dev, but production-safe rollout would eventually need explicit migrations.
- Browser support for `MediaRecorder` varies. Keep the first pass to supported browsers and show a readable error when unavailable.

## Recommended commit sequence

1. `feat: add rich party chat message model`
2. `feat: add party chat file and audio upload endpoints`
3. `test: add frontend chat test harness and rich message APIs`
4. `feat: add party chat composer for file and audio messages`
5. `feat: render file and audio messages in party chat`
6. `docs: update chat capabilities and agent context`

