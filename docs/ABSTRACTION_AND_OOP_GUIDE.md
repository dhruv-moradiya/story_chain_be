# Abstraction & OOP Concepts Guide

## Overview

This guide covers Object-Oriented Programming (OOP) concepts with a focus on **Abstraction** - one of the four pillars of OOP. All examples are tailored to your StoryChain backend using TypeScript and Node.js.

---

## Table of Contents

1. [The Four Pillars of OOP](#the-four-pillars-of-oop)
2. [What is Abstraction?](#what-is-abstraction)
3. [Abstraction vs Encapsulation](#abstraction-vs-encapsulation)
4. [Types of Abstraction](#types-of-abstraction)
5. [Abstract Classes](#abstract-classes)
6. [Interfaces](#interfaces)
7. [Abstract Classes vs Interfaces](#abstract-classes-vs-interfaces)
8. [Encapsulation Deep Dive](#encapsulation-deep-dive)
9. [Inheritance Deep Dive](#inheritance-deep-dive)
10. [Polymorphism Deep Dive](#polymorphism-deep-dive)
11. [Real-World Examples from Your Codebase](#real-world-examples-from-your-codebase)
12. [Common Patterns Using OOP](#common-patterns-using-oop)
13. [Best Practices](#best-practices)

---

## The Four Pillars of OOP

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FOUR PILLARS OF OOP                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  │   ABSTRACTION   │  │  ENCAPSULATION  │  │   INHERITANCE   │  │  POLYMORPHISM   │
│  │                 │  │                 │  │                 │  │                 │
│  │  "Hide complex- │  │  "Hide internal │  │  "Reuse code    │  │  "One interface,│
│  │   ity, show     │  │   details,      │  │   through       │  │   multiple      │
│  │   essentials"   │  │   expose API"   │  │   hierarchy"    │  │   behaviors"    │
│  │                 │  │                 │  │                 │  │                 │
│  │  WHAT to do     │  │  HOW it's done  │  │  IS-A relation  │  │  Same method,   │
│  │  (contract)     │  │  (protection)   │  │  (parent-child) │  │  diff results   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
│                                                                             │
│  Example:           Example:             Example:            Example:        │
│  interface IMailer  private password     class Dog extends   animal.speak() │
│  { send() }         getPassword()        Animal { }          dog → "Woof"   │
│                                                              cat → "Meow"   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Quick Summary

| Pillar | Question It Answers | Real-World Analogy |
|--------|--------------------|--------------------|
| **Abstraction** | "What can this do?" | Car dashboard (you see speedometer, not engine) |
| **Encapsulation** | "How is data protected?" | ATM (you can't access cash directly, only through PIN) |
| **Inheritance** | "How can I reuse code?" | Children inherit traits from parents |
| **Polymorphism** | "How can same action have different results?" | "Open" means different things for door vs file |

---

## What is Abstraction?

### Definition

> **Abstraction** is the process of hiding implementation details and showing only the essential features of an object. It focuses on **WHAT** an object does, not **HOW** it does it.

### The Concept Visualized

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ABSTRACTION CONCEPT                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  REAL WORLD: Driving a Car                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   WHAT YOU SEE (Abstraction):        WHAT'S HIDDEN (Implementation):│   │
│  │   ┌─────────────────────────┐        ┌─────────────────────────┐   │   │
│  │   │  - Steering wheel       │        │  - Engine combustion    │   │   │
│  │   │  - Gas pedal            │        │  - Fuel injection       │   │   │
│  │   │  - Brake pedal          │        │  - Transmission gears   │   │   │
│  │   │  - Speedometer          │        │  - Electrical system    │   │   │
│  │   │  - Gear shift           │        │  - Cooling system       │   │   │
│  │   └─────────────────────────┘        └─────────────────────────┘   │   │
│  │                                                                     │   │
│  │   You don't need to know HOW the engine works to DRIVE the car     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  IN CODE: Using a Repository                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   WHAT YOU SEE (Interface):          WHAT'S HIDDEN (Implementation):│   │
│  │   ┌─────────────────────────┐        ┌─────────────────────────┐   │   │
│  │   │  - findById(id)         │        │  - MongoDB connection   │   │   │
│  │   │  - create(data)         │        │  - Query building       │   │   │
│  │   │  - update(id, data)     │        │  - Index optimization   │   │   │
│  │   │  - delete(id)           │        │  - Connection pooling   │   │   │
│  │   └─────────────────────────┘        └─────────────────────────┘   │   │
│  │                                                                     │   │
│  │   Service doesn't need to know HOW data is stored to USE it        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Abstraction Matters

```typescript
// ❌ WITHOUT ABSTRACTION: Service knows too much about database
class StoryService {
  async getStory(id: string) {
    // Service has to know MongoDB specifics
    const connection = await MongoClient.connect('mongodb://localhost:27017');
    const db = connection.db('storychain');
    const collection = db.collection('stories');
    const story = await collection.findOne({ _id: new ObjectId(id) });
    await connection.close();
    return story;
  }
}

// ✅ WITH ABSTRACTION: Service only knows the contract
class StoryService {
  constructor(private repository: IStoryRepository) {}

  async getStory(id: string) {
    // Service doesn't know or care about MongoDB
    // It just knows repository has a findById method
    return this.repository.findById(id);
  }
}

// The repository hides all the complexity
interface IStoryRepository {
  findById(id: string): Promise<IStory | null>;
  create(data: Partial<IStory>): Promise<IStory>;
  update(id: string, data: Partial<IStory>): Promise<IStory | null>;
  delete(id: string): Promise<boolean>;
}
```

### Benefits of Abstraction

| Benefit | Explanation | Example |
|---------|-------------|---------|
| **Reduced Complexity** | Hide complex logic behind simple interface | `emailService.send(to, subject, body)` |
| **Loose Coupling** | Components don't depend on implementation details | Service doesn't know about MongoDB |
| **Easy Testing** | Mock the abstraction, not the implementation | `mockRepository.findById.mockResolvedValue(story)` |
| **Flexibility** | Swap implementations without changing code | Switch from MongoDB to PostgreSQL |
| **Security** | Hide sensitive implementation details | Database credentials not exposed |

---

## Abstraction vs Encapsulation

These two concepts are often confused. Here's the key difference:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ABSTRACTION vs ENCAPSULATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ABSTRACTION                           ENCAPSULATION                        │
│  ────────────                          ─────────────                        │
│  Focuses on: WHAT                      Focuses on: HOW                      │
│  Level: Design/Interface               Level: Implementation                │
│  Purpose: Hide complexity              Purpose: Hide data                   │
│  Achieved by: Interfaces,              Achieved by: Access modifiers        │
│               Abstract classes                      (private, protected)    │
│                                                                             │
│  ┌─────────────────────────┐           ┌─────────────────────────┐         │
│  │  interface IEmailer {   │           │  class EmailService {   │         │
│  │    send(email): void;   │           │    private apiKey: str; │ ← Hidden│
│  │  }                      │           │    private client: SDK; │ ← Hidden│
│  │  // Only WHAT to do     │           │                         │         │
│  │  // Not HOW             │           │    public send(email) { │ ← Exposed
│  └─────────────────────────┘           │      // uses apiKey     │         │
│                                        │    }                    │         │
│  "I don't care HOW you                 └─────────────────────────┘         │
│   send email, just that                                                    │
│   you CAN send email"                  "The apiKey is protected,           │
│                                         you can only use send()"           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Code Example: Both Working Together

```typescript
// ABSTRACTION: Defines WHAT a notification sender can do
interface INotificationSender {
  send(userId: string, message: string): Promise<void>;
  supports(channel: string): boolean;
}

// ENCAPSULATION: Hides HOW email sending works
class EmailNotificationSender implements INotificationSender {
  // Private - hidden from outside (ENCAPSULATION)
  private readonly apiKey: string;
  private readonly client: SendGridClient;
  private readonly fromAddress: string;

  constructor(config: EmailConfig) {
    // Internal setup - hidden
    this.apiKey = config.apiKey;
    this.client = new SendGridClient(this.apiKey);
    this.fromAddress = config.fromAddress;
  }

  // Public - exposed to outside (ABSTRACTION contract)
  async send(userId: string, message: string): Promise<void> {
    const user = await this.getUserEmail(userId);  // Private method
    await this.client.send({
      to: user.email,
      from: this.fromAddress,
      subject: 'Notification',
      text: message,
    });
  }

  supports(channel: string): boolean {
    return channel === 'email';
  }

  // Private helper - hidden (ENCAPSULATION)
  private async getUserEmail(userId: string): Promise<{ email: string }> {
    // Implementation detail
  }
}

// Consumer only sees the ABSTRACTION (interface)
class NotificationService {
  constructor(private senders: INotificationSender[]) {}

  async notify(userId: string, message: string, channel: string) {
    const sender = this.senders.find(s => s.supports(channel));
    if (sender) {
      await sender.send(userId, message);  // Doesn't know HOW it works
    }
  }
}
```

### Summary Table

| Aspect | Abstraction | Encapsulation |
|--------|-------------|---------------|
| **Focus** | Design level | Implementation level |
| **Hides** | Unnecessary details | Internal state |
| **Achieved through** | Interfaces, abstract classes | Access modifiers |
| **Question** | "What should this do?" | "How do I protect this?" |
| **Goal** | Simplify usage | Protect integrity |

---

## Types of Abstraction

### 1. Data Abstraction

Hiding the internal representation of data, exposing only operations.

```typescript
// ❌ WITHOUT Data Abstraction
class User {
  public firstName: string;
  public lastName: string;
  public birthYear: number;
  public birthMonth: number;
  public birthDay: number;
}

// Consumer has to calculate age themselves
const user = new User();
const age = new Date().getFullYear() - user.birthYear;

// ✅ WITH Data Abstraction
class User {
  private _firstName: string;
  private _lastName: string;
  private _dateOfBirth: Date;

  // Abstract the full name concept
  get fullName(): string {
    return `${this._firstName} ${this._lastName}`;
  }

  // Abstract the age calculation
  get age(): number {
    const today = new Date();
    const birth = this._dateOfBirth;
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  // Abstract whether user is adult
  get isAdult(): boolean {
    return this.age >= 18;
  }
}

// Consumer uses simple properties
const user = new User();
console.log(user.fullName);  // "John Doe"
console.log(user.age);       // 25
console.log(user.isAdult);   // true
```

### 2. Process Abstraction

Hiding the complex sequence of operations behind a simple method.

```typescript
// ❌ WITHOUT Process Abstraction
class StoryController {
  async publishStory(storyId: string, userId: string) {
    // Consumer has to know all the steps
    const story = await db.stories.findById(storyId);
    if (!story) throw new Error('Not found');
    if (story.creatorId !== userId) throw new Error('Forbidden');
    if (story.status !== 'draft') throw new Error('Already published');

    story.status = 'published';
    story.publishedAt = new Date();
    await story.save();

    const followers = await db.follows.find({ followingId: userId });
    for (const follower of followers) {
      await db.notifications.create({
        userId: follower.followerId,
        type: 'NEW_STORY',
        message: `${story.title} was published`,
      });
    }

    await analytics.track('story_published', { storyId });

    return story;
  }
}

// ✅ WITH Process Abstraction
class StoryService {
  constructor(
    private storyRepo: IStoryRepository,
    private notificationService: INotificationService,
    private analyticsService: IAnalyticsService
  ) {}

  // Complex process abstracted to single method
  async publishStory(storyId: string, userId: string): Promise<IStory> {
    const story = await this.validateAndGetStory(storyId, userId);
    const published = await this.updateStoryStatus(story, 'published');
    await this.notifyFollowers(published);
    await this.trackPublishing(published);
    return published;
  }

  // Each step is further abstracted
  private async validateAndGetStory(storyId: string, userId: string): Promise<IStory> {
    const story = await this.storyRepo.findById(storyId);
    if (!story) throw new NotFoundError('Story not found');
    if (!StoryRules.canPublish(story, userId)) throw new ForbiddenError();
    return story;
  }

  private async updateStoryStatus(story: IStory, status: string): Promise<IStory> {
    return this.storyRepo.update(story._id, { status, publishedAt: new Date() });
  }

  private async notifyFollowers(story: IStory): Promise<void> {
    await this.notificationService.notifyStoryPublished(story);
  }

  private async trackPublishing(story: IStory): Promise<void> {
    await this.analyticsService.track('story_published', { storyId: story._id });
  }
}

// Controller just calls one method
class StoryController {
  async publishStory(req: Request, res: Response) {
    const story = await this.storyService.publishStory(req.params.id, req.user.id);
    return res.json(story);
  }
}
```

### 3. Control Abstraction

Hiding the control flow (loops, conditionals) behind higher-order functions.

```typescript
// ❌ WITHOUT Control Abstraction
class StoryRepository {
  async findPublishedStoriesWithAuthors(): Promise<StoryWithAuthor[]> {
    const stories = await this.model.find({ status: 'published' });
    const results: StoryWithAuthor[] = [];

    for (const story of stories) {
      const author = await this.userModel.findById(story.creatorId);
      if (author) {
        results.push({
          ...story.toObject(),
          author: {
            id: author._id,
            username: author.username,
            avatarUrl: author.avatarUrl,
          },
        });
      }
    }

    return results;
  }
}

// ✅ WITH Control Abstraction
class StoryRepository {
  async findPublishedStoriesWithAuthors(): Promise<StoryWithAuthor[]> {
    // Control flow abstracted to MongoDB aggregation
    return this.model.aggregate([
      { $match: { status: 'published' } },
      {
        $lookup: {
          from: 'users',
          localField: 'creatorId',
          foreignField: 'clerkId',
          as: 'author',
        },
      },
      { $unwind: '$author' },
      {
        $project: {
          title: 1,
          slug: 1,
          status: 1,
          'author._id': 1,
          'author.username': 1,
          'author.avatarUrl': 1,
        },
      },
    ]);
  }
}

// Even better: Use Pipeline Builder for more abstraction
class StoryRepository {
  async findPublishedStoriesWithAuthors(): Promise<StoryWithAuthor[]> {
    const pipeline = new StoryPipelineBuilder()
      .matchPublished()
      .withAuthor()
      .projectBasicFields()
      .build();

    return this.model.aggregate(pipeline);
  }
}
```

---

## Abstract Classes

### What is an Abstract Class?

> An **abstract class** is a class that cannot be instantiated directly. It serves as a blueprint for other classes, defining common behavior and forcing subclasses to implement specific methods.

### Syntax and Structure

```typescript
// Abstract class - cannot be instantiated directly
abstract class Animal {
  // Regular property
  protected name: string;

  // Constructor can exist
  constructor(name: string) {
    this.name = name;
  }

  // Regular method with implementation
  eat(): void {
    console.log(`${this.name} is eating`);
  }

  // Abstract method - NO implementation
  // Subclasses MUST implement this
  abstract makeSound(): string;

  // Abstract method with return type
  abstract move(): void;
}

// ❌ Cannot do this
// const animal = new Animal('Generic'); // Error: Cannot create instance of abstract class

// ✅ Must extend and implement abstract methods
class Dog extends Animal {
  constructor(name: string) {
    super(name);
  }

  // MUST implement abstract method
  makeSound(): string {
    return 'Woof!';
  }

  // MUST implement abstract method
  move(): void {
    console.log(`${this.name} runs on four legs`);
  }

  // Can add additional methods
  fetch(): void {
    console.log(`${this.name} fetches the ball`);
  }
}

class Bird extends Animal {
  makeSound(): string {
    return 'Chirp!';
  }

  move(): void {
    console.log(`${this.name} flies through the air`);
  }
}

// Usage
const dog = new Dog('Buddy');
dog.eat();        // "Buddy is eating" (inherited)
dog.makeSound();  // "Woof!" (implemented)
dog.move();       // "Buddy runs on four legs" (implemented)
dog.fetch();      // "Buddy fetches the ball" (own method)
```

### Your Codebase: BaseModule Abstract Class

```typescript
// utils/baseClass.ts
export abstract class BaseModule {
  protected logger = logger;

  // Concrete methods - available to all subclasses
  protected logInfo(message: string, data?: unknown): void {
    this.logger.info(message, data);
  }

  protected logError(message: string, error?: unknown): void {
    this.logger.error(message, error);
  }

  protected logDebug(message: string, data?: unknown): void {
    this.logger.debug(message, data);
  }

  // Error throwing helpers
  protected throwBadRequest(message?: string): never {
    throw ApiError.badRequest(message);
  }

  protected throwNotFoundError(message?: string): never {
    throw ApiError.notFound(message);
  }

  protected throwForbiddenError(message?: string): never {
    throw ApiError.forbidden(message);
  }

  protected throwUnauthorizedError(message?: string): never {
    throw ApiError.unauthorized(message);
  }

  protected throwConflictError(message?: string): never {
    throw ApiError.conflict(message);
  }

  protected throwValidationError(message?: string): never {
    throw ApiError.validationError(message);
  }

  protected throwTooManyRequestsError(message?: string): never {
    throw ApiError.tooManyRequests(message);
  }

  protected throwInternalError(message?: string): never {
    throw ApiError.internalError(message);
  }

  // Lifecycle hooks - can be overridden
  async initialize(): Promise<void> {}
  async destroy(): Promise<void> {}
}

// All services extend BaseModule
@singleton()
class StoryService extends BaseModule {
  constructor(
    @inject(TOKENS.StoryRepository) private storyRepo: StoryRepository
  ) {
    super();  // Call parent constructor
  }

  async getStory(slug: string): Promise<IStory> {
    const story = await this.storyRepo.findBySlug(slug);

    if (!story) {
      // Using inherited method
      this.throwNotFoundError('Story not found');
    }

    // Using inherited logging
    this.logInfo('Story retrieved', { slug });

    return story;
  }
}
```

### Your Codebase: BaseRepository Abstract Class

```typescript
// utils/baseClass.ts
export abstract class BaseRepository<TEntity, TDocument extends Document> {
  protected model: Model<TDocument>;

  constructor(model: Model<TDocument>) {
    this.model = model;
  }

  // Generic CRUD operations
  async create(data: Partial<TEntity>, options?: IOperationOptions): Promise<TEntity> {
    const [doc] = await this.model.create([data], { session: options?.session });
    return doc.toObject() as TEntity;
  }

  async findById(
    id: ID,
    projection?: ProjectionType<TDocument> | null,
    options?: IOperationOptions
  ): Promise<TEntity | null> {
    const query = this.model.findById(id, projection);
    if (options?.session) query.session(options.session);
    return query.lean<TEntity>().exec();
  }

  async findOne(
    filter: FilterQuery<TDocument>,
    projection?: ProjectionType<TDocument> | null,
    options?: IOperationOptions
  ): Promise<TEntity | null> {
    const query = this.model.findOne(filter, projection);
    if (options?.session) query.session(options.session);
    return query.lean<TEntity>().exec();
  }

  async findMany(
    filter: FilterQuery<TDocument>,
    projection?: ProjectionType<TDocument> | null,
    options?: IOperationOptions & { limit?: number; skip?: number; sort?: any }
  ): Promise<TEntity[]> {
    let query = this.model.find(filter, projection);
    if (options?.session) query.session(options.session);
    if (options?.limit) query.limit(options.limit);
    if (options?.skip) query.skip(options.skip);
    if (options?.sort) query.sort(options.sort);
    return query.lean<TEntity[]>().exec();
  }

  async findOneAndUpdate(
    filter: FilterQuery<TDocument>,
    update: UpdateQuery<TDocument>,
    options?: IOperationOptions
  ): Promise<TEntity | null> {
    return this.model
      .findOneAndUpdate(filter, update, { new: true, session: options?.session })
      .lean<TEntity>()
      .exec();
  }

  async count(filter: FilterQuery<TDocument>, options?: IOperationOptions): Promise<number> {
    return this.model.countDocuments(filter, { session: options?.session });
  }

  async softDelete(id: ID, options?: IOperationOptions): Promise<boolean> {
    const result = await this.model.findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date(), isDeleted: true } },
      { session: options?.session }
    );
    return !!result;
  }
}

// Concrete repository extends abstract base
@singleton()
export class StoryRepository extends BaseRepository<IStory, IStoryDoc> {
  constructor() {
    super(Story);  // Pass the Mongoose model
  }

  // Story-specific methods
  async findBySlug(slug: string, options?: IOperationOptions): Promise<IStory | null> {
    return this.findOne({ slug }, null, options);
  }

  async findByCreator(creatorId: string, options?: IOperationOptions): Promise<IStory[]> {
    return this.findMany({ creatorId }, null, options);
  }

  async countByCreatorInDateRange(
    creatorId: string,
    start: Date,
    end: Date,
    options?: IOperationOptions
  ): Promise<number> {
    return this.count(
      { creatorId, createdAt: { $gte: start, $lte: end } },
      options
    );
  }

  // Aggregation methods
  async aggregateWithAuthor(pipeline: PipelineStage[]): Promise<IStory[]> {
    return this.model.aggregate(pipeline).exec();
  }
}
```

### When to Use Abstract Classes

| Use Abstract Class When | Example |
|------------------------|---------|
| You want to share code among related classes | BaseModule, BaseRepository |
| Classes share state (fields) | `protected model: Model<T>` |
| You need non-public members | `protected`, `private` methods |
| You want to provide default implementations | `logInfo()`, `throwNotFoundError()` |
| There's a clear "is-a" relationship | StoryService IS-A BaseModule |

---

## Interfaces

### What is an Interface?

> An **interface** defines a contract that classes must follow. It specifies WHAT methods and properties a class must have, but not HOW they're implemented.

### Syntax and Structure

```typescript
// Interface definition
interface IVehicle {
  // Properties (can be readonly)
  readonly brand: string;
  model: string;
  year: number;

  // Methods (only signatures, no implementation)
  start(): void;
  stop(): void;
  accelerate(speed: number): void;
  getInfo(): string;
}

// Class implementing interface
class Car implements IVehicle {
  readonly brand: string;
  model: string;
  year: number;
  private isRunning: boolean = false;

  constructor(brand: string, model: string, year: number) {
    this.brand = brand;
    this.model = model;
    this.year = year;
  }

  // MUST implement all interface methods
  start(): void {
    this.isRunning = true;
    console.log('Car started');
  }

  stop(): void {
    this.isRunning = false;
    console.log('Car stopped');
  }

  accelerate(speed: number): void {
    if (this.isRunning) {
      console.log(`Accelerating to ${speed} km/h`);
    }
  }

  getInfo(): string {
    return `${this.year} ${this.brand} ${this.model}`;
  }

  // Can have additional methods
  honk(): void {
    console.log('Beep beep!');
  }
}

// Motorcycle also implements IVehicle
class Motorcycle implements IVehicle {
  readonly brand: string;
  model: string;
  year: number;

  constructor(brand: string, model: string, year: number) {
    this.brand = brand;
    this.model = model;
    this.year = year;
  }

  start(): void {
    console.log('Motorcycle engine roars');
  }

  stop(): void {
    console.log('Motorcycle stopped');
  }

  accelerate(speed: number): void {
    console.log(`Zooming to ${speed} km/h`);
  }

  getInfo(): string {
    return `${this.year} ${this.brand} ${this.model} Motorcycle`;
  }

  // Motorcycle-specific
  wheelie(): void {
    console.log('Doing a wheelie!');
  }
}

// Both can be used where IVehicle is expected
function testDrive(vehicle: IVehicle): void {
  console.log(`Testing: ${vehicle.getInfo()}`);
  vehicle.start();
  vehicle.accelerate(60);
  vehicle.stop();
}

testDrive(new Car('Toyota', 'Camry', 2023));
testDrive(new Motorcycle('Honda', 'CBR', 2023));
```

### Multiple Interface Implementation

```typescript
// Multiple interfaces
interface IReadable {
  read(): string;
}

interface IWritable {
  write(data: string): void;
}

interface IDeletable {
  delete(): boolean;
}

// Class can implement multiple interfaces
class Document implements IReadable, IWritable, IDeletable {
  private content: string = '';

  read(): string {
    return this.content;
  }

  write(data: string): void {
    this.content = data;
  }

  delete(): boolean {
    this.content = '';
    return true;
  }
}

// ReadOnlyDocument only implements IReadable
class ReadOnlyDocument implements IReadable {
  constructor(private content: string) {}

  read(): string {
    return this.content;
  }
}
```

### Interface for Your Codebase

```typescript
// interfaces/repositories.ts

// Base readable interface
interface IReadableRepository<T> {
  findById(id: string): Promise<T | null>;
  findOne(filter: object): Promise<T | null>;
  findMany(filter: object): Promise<T[]>;
}

// Base writable interface
interface IWritableRepository<T> {
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

// Combined CRUD interface
interface ICrudRepository<T> extends IReadableRepository<T>, IWritableRepository<T> {}

// Story-specific interface
interface IStoryRepository extends ICrudRepository<IStory> {
  findBySlug(slug: string): Promise<IStory | null>;
  findByCreator(creatorId: string): Promise<IStory[]>;
  countByCreatorInDateRange(creatorId: string, start: Date, end: Date): Promise<number>;
}

// User-specific interface
interface IUserRepository extends ICrudRepository<IUser> {
  findByClerkId(clerkId: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findByUsername(username: string): Promise<IUser | null>;
}

// Service interfaces
interface IStoryService {
  createStory(input: IStoryCreateDTO): Promise<IStory>;
  getStory(slug: string): Promise<IStory>;
  updateStory(slug: string, input: IStoryUpdateDTO): Promise<IStory>;
  deleteStory(slug: string): Promise<void>;
  publishStory(slug: string, userId: string): Promise<IStory>;
}

interface INotificationService {
  notify(userId: string, notification: INotification): Promise<void>;
  notifyMany(userIds: string[], notification: INotification): Promise<void>;
  markAsRead(notificationId: string): Promise<void>;
}
```

### Interface Extending Interface

```typescript
// Base notification
interface INotification {
  id: string;
  type: string;
  message: string;
  createdAt: Date;
}

// Email notification extends base
interface IEmailNotification extends INotification {
  subject: string;
  htmlBody: string;
  recipientEmail: string;
}

// Push notification extends base
interface IPushNotification extends INotification {
  title: string;
  body: string;
  icon?: string;
  action?: {
    label: string;
    url: string;
  };
}

// Combined notification with all channels
interface IMultiChannelNotification extends INotification {
  email?: Omit<IEmailNotification, keyof INotification>;
  push?: Omit<IPushNotification, keyof INotification>;
  inApp?: {
    persistent: boolean;
  };
}
```

---

## Abstract Classes vs Interfaces

### Side-by-Side Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  ABSTRACT CLASS vs INTERFACE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ABSTRACT CLASS                        INTERFACE                            │
│  ──────────────                        ─────────                            │
│                                                                             │
│  abstract class Animal {               interface IAnimal {                  │
│    protected name: string;               name: string;                      │
│                                                                             │
│    constructor(name: string) {           // No constructor                  │
│      this.name = name;                                                      │
│    }                                                                        │
│                                                                             │
│    // Concrete method                    // Only signatures                 │
│    eat(): void {                         eat(): void;                       │
│      console.log('eating');              makeSound(): string;               │
│    }                                   }                                    │
│                                                                             │
│    // Abstract method                                                       │
│    abstract makeSound(): string;                                            │
│  }                                                                          │
│                                                                             │
│  ✓ Can have implementation             ✗ No implementation                 │
│  ✓ Can have constructor                ✗ No constructor                    │
│  ✓ Can have access modifiers           ✗ All public by default             │
│  ✓ Can have state (fields)             ~ Only property signatures          │
│  ✗ Single inheritance only             ✓ Multiple implementation           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### When to Use Which

```typescript
// USE ABSTRACT CLASS when:
// 1. You want to share code among closely related classes
// 2. You need non-public members
// 3. You want to declare non-static or non-final fields

abstract class BaseRepository<T> {
  protected model: Model<T>;           // Shared state
  protected logger = new Logger();     // Shared dependency

  constructor(model: Model<T>) {
    this.model = model;
  }

  // Shared implementation
  async findById(id: string): Promise<T | null> {
    this.logger.debug(`Finding by id: ${id}`);
    return this.model.findById(id).lean().exec();
  }

  // Force subclasses to implement
  abstract validate(data: Partial<T>): boolean;
}

// USE INTERFACE when:
// 1. You want to define a contract only
// 2. Unrelated classes will implement it
// 3. You need multiple inheritance of type
// 4. You want to specify the shape of an object

interface ISerializable {
  serialize(): string;
  deserialize(data: string): void;
}

interface IComparable<T> {
  compareTo(other: T): number;
}

interface IClonable<T> {
  clone(): T;
}

// Class can implement multiple interfaces
class Story implements ISerializable, IComparable<Story>, IClonable<Story> {
  serialize(): string {
    return JSON.stringify(this);
  }

  deserialize(data: string): void {
    Object.assign(this, JSON.parse(data));
  }

  compareTo(other: Story): number {
    return this.createdAt.getTime() - other.createdAt.getTime();
  }

  clone(): Story {
    return Object.assign(new Story(), this);
  }
}
```

### Combining Both

```typescript
// Interface defines the contract
interface INotificationSender {
  send(notification: INotification): Promise<void>;
  supports(type: string): boolean;
}

// Abstract class provides base implementation
abstract class BaseNotificationSender implements INotificationSender {
  protected readonly logger = new Logger();
  protected abstract readonly supportedTypes: string[];

  // Implement interface method with common logic
  async send(notification: INotification): Promise<void> {
    this.logger.info(`Sending ${notification.type} notification`);

    if (!this.supports(notification.type)) {
      throw new Error(`Unsupported notification type: ${notification.type}`);
    }

    await this.doSend(notification);
  }

  // Implement interface method
  supports(type: string): boolean {
    return this.supportedTypes.includes(type);
  }

  // Abstract method for subclasses
  protected abstract doSend(notification: INotification): Promise<void>;
}

// Concrete implementation
class EmailNotificationSender extends BaseNotificationSender {
  protected readonly supportedTypes = ['WELCOME', 'PASSWORD_RESET', 'STORY_PUBLISHED'];
  private emailClient: EmailClient;

  constructor(emailClient: EmailClient) {
    super();
    this.emailClient = emailClient;
  }

  protected async doSend(notification: INotification): Promise<void> {
    await this.emailClient.send({
      to: notification.recipientEmail,
      subject: notification.subject,
      html: notification.htmlBody,
    });
  }
}

class PushNotificationSender extends BaseNotificationSender {
  protected readonly supportedTypes = ['NEW_CHAPTER', 'COMMENT', 'MENTION'];
  private pushClient: PushClient;

  constructor(pushClient: PushClient) {
    super();
    this.pushClient = pushClient;
  }

  protected async doSend(notification: INotification): Promise<void> {
    await this.pushClient.send({
      userId: notification.userId,
      title: notification.title,
      body: notification.message,
    });
  }
}
```

---

## Encapsulation Deep Dive

### What is Encapsulation?

> **Encapsulation** is bundling data (fields) and methods that operate on that data within a single unit (class), and restricting direct access to some of the object's components.

### Access Modifiers in TypeScript

```typescript
class BankAccount {
  // PUBLIC: Accessible from anywhere
  public accountHolder: string;

  // PRIVATE: Only accessible within THIS class
  private balance: number;
  private transactionHistory: Transaction[] = [];

  // PROTECTED: Accessible within this class and subclasses
  protected accountType: string;

  // READONLY: Can only be set in constructor
  readonly accountNumber: string;

  constructor(holder: string, initialDeposit: number, accountNumber: string) {
    this.accountHolder = holder;
    this.balance = initialDeposit;
    this.accountNumber = accountNumber;
    this.accountType = 'standard';
  }

  // PUBLIC method to interact with private data
  public deposit(amount: number): void {
    if (amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }
    this.balance += amount;
    this.recordTransaction('deposit', amount);
  }

  public withdraw(amount: number): void {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be positive');
    }
    if (amount > this.balance) {
      throw new Error('Insufficient funds');
    }
    this.balance -= amount;
    this.recordTransaction('withdrawal', amount);
  }

  // Getter - controlled access to private data
  public getBalance(): number {
    return this.balance;
  }

  // PRIVATE helper method
  private recordTransaction(type: string, amount: number): void {
    this.transactionHistory.push({
      type,
      amount,
      date: new Date(),
      balanceAfter: this.balance,
    });
  }

  // PROTECTED method - available to subclasses
  protected getTransactionHistory(): Transaction[] {
    return [...this.transactionHistory]; // Return copy, not original
  }
}

// Subclass can access protected members
class PremiumAccount extends BankAccount {
  private rewardPoints: number = 0;

  constructor(holder: string, initialDeposit: number, accountNumber: string) {
    super(holder, initialDeposit, accountNumber);
    this.accountType = 'premium'; // Can access protected
  }

  public getRewardPoints(): number {
    return this.rewardPoints;
  }

  public getStatement(): string {
    // Can access protected method
    const history = this.getTransactionHistory();
    return history.map(t => `${t.type}: ${t.amount}`).join('\n');
  }
}

// Usage
const account = new BankAccount('John', 1000, 'ACC001');

account.accountHolder;    // ✅ Public - accessible
account.deposit(500);     // ✅ Public method
account.getBalance();     // ✅ 1500

// account.balance;       // ❌ Error: Property 'balance' is private
// account.transactionHistory; // ❌ Error: Private
// account.recordTransaction(); // ❌ Error: Private method
```

### Encapsulation Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ENCAPSULATION                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         BankAccount Class                            │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                    PRIVATE (Hidden)                           │  │   │
│  │  │                                                               │  │   │
│  │  │    balance: number                                            │  │   │
│  │  │    transactionHistory: Transaction[]                          │  │   │
│  │  │    recordTransaction(type, amount): void                      │  │   │
│  │  │                                                               │  │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐  │  │   │
│  │  │  │              PROTECTED (Subclass Access)                │  │  │   │
│  │  │  │                                                         │  │  │   │
│  │  │  │    accountType: string                                  │  │  │   │
│  │  │  │    getTransactionHistory(): Transaction[]               │  │  │   │
│  │  │  │                                                         │  │  │   │
│  │  │  └─────────────────────────────────────────────────────────┘  │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                    PUBLIC (Exposed API)                       │  │   │
│  │  │                                                               │  │   │
│  │  │    accountHolder: string                                      │  │   │
│  │  │    accountNumber: string (readonly)                           │  │   │
│  │  │    deposit(amount): void                                      │  │   │
│  │  │    withdraw(amount): void                                     │  │   │
│  │  │    getBalance(): number                                       │  │   │
│  │  │                                                               │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Outside code can ONLY access PUBLIC members                               │
│  Private data is protected from direct manipulation                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Getters and Setters

```typescript
class User {
  private _email: string;
  private _password: string;
  private _loginAttempts: number = 0;
  private _isLocked: boolean = false;

  constructor(email: string, password: string) {
    this._email = email;
    this._password = this.hashPassword(password);
  }

  // GETTER - computed/controlled read access
  get email(): string {
    return this._email;
  }

  // SETTER - validated write access
  set email(value: string) {
    if (!this.isValidEmail(value)) {
      throw new Error('Invalid email format');
    }
    this._email = value.toLowerCase();
  }

  // GETTER only (read-only from outside)
  get isLocked(): boolean {
    return this._isLocked;
  }

  get loginAttempts(): number {
    return this._loginAttempts;
  }

  // No getter for password - truly private
  // No setter for password - use changePassword method instead

  // Controlled password change
  changePassword(oldPassword: string, newPassword: string): boolean {
    if (!this.verifyPassword(oldPassword)) {
      return false;
    }
    if (!this.isStrongPassword(newPassword)) {
      throw new Error('Password does not meet requirements');
    }
    this._password = this.hashPassword(newPassword);
    return true;
  }

  // Verify password (doesn't expose the hash)
  verifyPassword(password: string): boolean {
    if (this._isLocked) {
      throw new Error('Account is locked');
    }

    const isValid = this.hashPassword(password) === this._password;

    if (!isValid) {
      this._loginAttempts++;
      if (this._loginAttempts >= 5) {
        this._isLocked = true;
      }
    } else {
      this._loginAttempts = 0;
    }

    return isValid;
  }

  // Private helpers
  private hashPassword(password: string): string {
    // In reality, use bcrypt or argon2
    return `hashed_${password}`;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isStrongPassword(password: string): boolean {
    return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
  }
}

// Usage
const user = new User('John@Example.com', 'MyPassword123');

console.log(user.email);           // "john@example.com" (normalized)
user.email = 'New@Email.com';      // Validated and normalized
// user.email = 'invalid';         // ❌ Error: Invalid email format

console.log(user.isLocked);        // false (read-only)
// user.isLocked = true;           // ❌ Error: No setter

// user._password;                 // ❌ Error: Private
// user.password;                  // ❌ Error: No getter

user.verifyPassword('wrong');      // false, increments attempts
user.changePassword('MyPassword123', 'NewSecure1'); // ✅
```

### Encapsulation in Your Codebase

```typescript
// features/user/services/user.service.ts
@singleton()
class UserService extends BaseModule {
  // Private - not accessible outside
  private readonly userRepo: UserRepository;
  private readonly platformRoleRepo: PlatformRoleRepository;
  private readonly cacheService: CacheService;

  constructor(
    @inject(TOKENS.UserRepository) userRepo: UserRepository,
    @inject(TOKENS.PlatformRoleRepository) platformRoleRepo: PlatformRoleRepository,
    @inject(TOKENS.CacheService) cacheService: CacheService
  ) {
    super();
    this.userRepo = userRepo;
    this.platformRoleRepo = platformRoleRepo;
    this.cacheService = cacheService;
  }

  // PUBLIC API - what consumers can use
  async getUserByClerkId(clerkId: string): Promise<IUser> {
    // Try cache first (implementation detail hidden)
    const cached = await this.getFromCache(clerkId);
    if (cached) return cached;

    // Fetch from database
    const user = await this.userRepo.findByClerkId(clerkId);
    if (!user) {
      this.throwNotFoundError('User not found');
    }

    // Cache for future (implementation detail hidden)
    await this.cacheUser(user);

    return user;
  }

  async updateUser(clerkId: string, data: IUserUpdateDTO): Promise<IUser> {
    // Validation (hidden)
    this.validateUpdateData(data);

    // Update
    const user = await this.userRepo.updateByClerkId(clerkId, data);
    if (!user) {
      this.throwNotFoundError('User not found');
    }

    // Invalidate cache (hidden)
    await this.invalidateCache(clerkId);

    return user;
  }

  // PRIVATE helpers - implementation details hidden
  private async getFromCache(clerkId: string): Promise<IUser | null> {
    const key = this.getCacheKey(clerkId);
    return this.cacheService.get<IUser>(key);
  }

  private async cacheUser(user: IUser): Promise<void> {
    const key = this.getCacheKey(user.clerkId);
    await this.cacheService.set(key, user, 3600); // 1 hour TTL
  }

  private async invalidateCache(clerkId: string): Promise<void> {
    const key = this.getCacheKey(clerkId);
    await this.cacheService.delete(key);
  }

  private getCacheKey(clerkId: string): string {
    return `user:${clerkId}`;
  }

  private validateUpdateData(data: IUserUpdateDTO): void {
    if (data.username && data.username.length < 3) {
      this.throwValidationError('Username must be at least 3 characters');
    }
    if (data.bio && data.bio.length > 500) {
      this.throwValidationError('Bio must be under 500 characters');
    }
  }
}
```

---

## Inheritance Deep Dive

### What is Inheritance?

> **Inheritance** is a mechanism where a new class (child/subclass) derives properties and behaviors from an existing class (parent/superclass). It represents an "IS-A" relationship.

### Basic Inheritance

```typescript
// Parent/Super/Base class
class Animal {
  protected name: string;
  protected age: number;

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  eat(): void {
    console.log(`${this.name} is eating`);
  }

  sleep(): void {
    console.log(`${this.name} is sleeping`);
  }

  getInfo(): string {
    return `${this.name}, ${this.age} years old`;
  }
}

// Child/Sub/Derived class
class Dog extends Animal {
  private breed: string;

  constructor(name: string, age: number, breed: string) {
    super(name, age);  // Call parent constructor
    this.breed = breed;
  }

  // New method specific to Dog
  bark(): void {
    console.log(`${this.name} says: Woof!`);
  }

  fetch(): void {
    console.log(`${this.name} is fetching the ball`);
  }

  // Override parent method
  getInfo(): string {
    return `${super.getInfo()}, ${this.breed}`;  // Call parent method
  }
}

class Cat extends Animal {
  private isIndoor: boolean;

  constructor(name: string, age: number, isIndoor: boolean) {
    super(name, age);
    this.isIndoor = isIndoor;
  }

  meow(): void {
    console.log(`${this.name} says: Meow!`);
  }

  scratch(): void {
    console.log(`${this.name} is scratching furniture`);
  }

  getInfo(): string {
    const indoor = this.isIndoor ? 'indoor' : 'outdoor';
    return `${super.getInfo()}, ${indoor} cat`;
  }
}

// Usage
const dog = new Dog('Buddy', 3, 'Golden Retriever');
dog.eat();       // Inherited: "Buddy is eating"
dog.sleep();     // Inherited: "Buddy is sleeping"
dog.bark();      // Own: "Buddy says: Woof!"
dog.getInfo();   // Overridden: "Buddy, 3 years old, Golden Retriever"

const cat = new Cat('Whiskers', 2, true);
cat.eat();       // Inherited: "Whiskers is eating"
cat.meow();      // Own: "Whiskers says: Meow!"
cat.getInfo();   // Overridden: "Whiskers, 2 years old, indoor cat"
```

### Inheritance Hierarchy Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INHERITANCE HIERARCHY                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                            ┌─────────────┐                                  │
│                            │   Animal    │  (Parent/Base)                   │
│                            │─────────────│                                  │
│                            │ # name      │                                  │
│                            │ # age       │                                  │
│                            │─────────────│                                  │
│                            │ + eat()     │                                  │
│                            │ + sleep()   │                                  │
│                            │ + getInfo() │                                  │
│                            └──────┬──────┘                                  │
│                                   │                                         │
│                    ┌──────────────┼──────────────┐                         │
│                    │              │              │                         │
│              ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐                   │
│              │    Dog    │  │    Cat    │  │   Bird    │  (Children)       │
│              │───────────│  │───────────│  │───────────│                   │
│              │ - breed   │  │ - isIndoor│  │ - canFly  │                   │
│              │───────────│  │───────────│  │───────────│                   │
│              │ + bark()  │  │ + meow()  │  │ + chirp() │                   │
│              │ + fetch() │  │ + scratch │  │ + fly()   │                   │
│              │ + getInfo │  │ + getInfo │  │ + getInfo │  (overridden)     │
│              └───────────┘  └───────────┘  └───────────┘                   │
│                                                                             │
│  Legend:                                                                    │
│  # = protected (accessible in subclasses)                                  │
│  - = private (only in that class)                                          │
│  + = public (accessible everywhere)                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Method Overriding

```typescript
class Shape {
  protected color: string;

  constructor(color: string) {
    this.color = color;
  }

  // Virtual method - can be overridden
  getArea(): number {
    return 0;
  }

  getPerimeter(): number {
    return 0;
  }

  describe(): string {
    return `A ${this.color} shape`;
  }
}

class Rectangle extends Shape {
  private width: number;
  private height: number;

  constructor(color: string, width: number, height: number) {
    super(color);
    this.width = width;
    this.height = height;
  }

  // Override with specific implementation
  getArea(): number {
    return this.width * this.height;
  }

  getPerimeter(): number {
    return 2 * (this.width + this.height);
  }

  describe(): string {
    return `${super.describe()} rectangle (${this.width}x${this.height})`;
  }
}

class Circle extends Shape {
  private radius: number;

  constructor(color: string, radius: number) {
    super(color);
    this.radius = radius;
  }

  getArea(): number {
    return Math.PI * this.radius ** 2;
  }

  getPerimeter(): number {
    return 2 * Math.PI * this.radius;
  }

  describe(): string {
    return `${super.describe()} circle (radius: ${this.radius})`;
  }
}

// Usage - polymorphic behavior
const shapes: Shape[] = [
  new Rectangle('red', 10, 5),
  new Circle('blue', 7),
];

for (const shape of shapes) {
  console.log(shape.describe());
  console.log(`Area: ${shape.getArea()}`);
  console.log(`Perimeter: ${shape.getPerimeter()}`);
}
```

### Inheritance in Your Codebase

```typescript
// All services inherit from BaseModule
@singleton()
class StoryService extends BaseModule {
  // Inherits: logger, logInfo, logError, throwBadRequest, etc.

  async createStory(input: IStoryCreateDTO): Promise<IStory> {
    // Using inherited methods
    this.logInfo('Creating story', { title: input.title });

    if (!input.title) {
      this.throwBadRequest('Title is required');  // Inherited
    }

    const story = await this.storyRepo.create(input);
    this.logInfo('Story created', { id: story._id });  // Inherited

    return story;
  }
}

// All repositories inherit from BaseRepository
@singleton()
class StoryRepository extends BaseRepository<IStory, IStoryDoc> {
  // Inherits: create, findById, findOne, findMany, update, delete, etc.

  constructor() {
    super(Story);  // Pass model to parent
  }

  // Add story-specific methods
  async findBySlug(slug: string): Promise<IStory | null> {
    return this.findOne({ slug });  // Using inherited method
  }

  async findPublished(): Promise<IStory[]> {
    return this.findMany({ status: 'published' });  // Using inherited method
  }
}
```

### Composition vs Inheritance

```typescript
// ❌ INHERITANCE can lead to rigid hierarchies
class Animal { }
class FlyingAnimal extends Animal { fly() { } }
class SwimmingAnimal extends Animal { swim() { } }
// What about a duck that can both fly AND swim?
// class Duck extends FlyingAnimal, SwimmingAnimal { } // ❌ Not possible!

// ✅ COMPOSITION is more flexible
interface Flyable {
  fly(): void;
}

interface Swimmable {
  swim(): void;
}

interface Walkable {
  walk(): void;
}

// Compose behaviors
class Duck implements Flyable, Swimmable, Walkable {
  fly(): void {
    console.log('Duck flying');
  }

  swim(): void {
    console.log('Duck swimming');
  }

  walk(): void {
    console.log('Duck walking');
  }
}

class Penguin implements Swimmable, Walkable {
  swim(): void {
    console.log('Penguin swimming');
  }

  walk(): void {
    console.log('Penguin waddling');
  }
}

class Eagle implements Flyable, Walkable {
  fly(): void {
    console.log('Eagle soaring');
  }

  walk(): void {
    console.log('Eagle walking');
  }
}
```

### "Favor Composition Over Inheritance"

```typescript
// Using composition in your codebase

// Instead of deep inheritance hierarchies, compose services
@singleton()
class StoryService extends BaseModule {
  constructor(
    // Compose with other services
    @inject(TOKENS.StoryRepository) private storyRepo: StoryRepository,
    @inject(TOKENS.ChapterService) private chapterService: ChapterService,
    @inject(TOKENS.NotificationService) private notificationService: NotificationService,
    @inject(TOKENS.CacheService) private cacheService: CacheService
  ) {
    super();
  }

  // Delegate to composed services
  async publishStory(slug: string): Promise<IStory> {
    const story = await this.storyRepo.findBySlug(slug);

    // Delegate chapter operations
    await this.chapterService.validateChaptersForPublishing(slug);

    // Update story
    const published = await this.storyRepo.update(story._id, { status: 'published' });

    // Delegate notification
    await this.notificationService.notifyStoryPublished(published);

    // Delegate caching
    await this.cacheService.invalidate(`story:${slug}`);

    return published;
  }
}
```

---

## Polymorphism Deep Dive

### What is Polymorphism?

> **Polymorphism** means "many forms". It allows objects of different classes to be treated as objects of a common parent class. The same method call can behave differently based on the object's actual type.

### Types of Polymorphism

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TYPES OF POLYMORPHISM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. COMPILE-TIME (Static) Polymorphism                                      │
│     ─────────────────────────────────                                       │
│     - Method Overloading: Same name, different parameters                   │
│     - Resolved at compile time                                              │
│                                                                             │
│     class Calculator {                                                      │
│       add(a: number, b: number): number;                                   │
│       add(a: string, b: string): string;                                   │
│       add(a: any, b: any): any {                                           │
│         return a + b;                                                       │
│       }                                                                     │
│     }                                                                       │
│                                                                             │
│  2. RUNTIME (Dynamic) Polymorphism                                          │
│     ──────────────────────────────                                          │
│     - Method Overriding: Same name & params, different implementation      │
│     - Resolved at runtime based on actual object type                      │
│                                                                             │
│     class Animal { speak() { } }                                           │
│     class Dog extends Animal { speak() { return "Woof"; } }                │
│     class Cat extends Animal { speak() { return "Meow"; } }                │
│                                                                             │
│     const animal: Animal = new Dog();                                      │
│     animal.speak(); // "Woof" - resolved at runtime                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Runtime Polymorphism Example

```typescript
// Base class or interface
interface IPaymentProcessor {
  processPayment(amount: number): Promise<PaymentResult>;
  refund(transactionId: string): Promise<RefundResult>;
  getName(): string;
}

// Different implementations
class StripeProcessor implements IPaymentProcessor {
  async processPayment(amount: number): Promise<PaymentResult> {
    console.log(`Processing $${amount} via Stripe`);
    // Stripe-specific implementation
    return { success: true, transactionId: 'stripe_123' };
  }

  async refund(transactionId: string): Promise<RefundResult> {
    console.log(`Refunding ${transactionId} via Stripe`);
    return { success: true };
  }

  getName(): string {
    return 'Stripe';
  }
}

class PayPalProcessor implements IPaymentProcessor {
  async processPayment(amount: number): Promise<PaymentResult> {
    console.log(`Processing $${amount} via PayPal`);
    // PayPal-specific implementation
    return { success: true, transactionId: 'paypal_456' };
  }

  async refund(transactionId: string): Promise<RefundResult> {
    console.log(`Refunding ${transactionId} via PayPal`);
    return { success: true };
  }

  getName(): string {
    return 'PayPal';
  }
}

class CryptoProcessor implements IPaymentProcessor {
  async processPayment(amount: number): Promise<PaymentResult> {
    console.log(`Processing $${amount} via Crypto`);
    // Crypto-specific implementation
    return { success: true, transactionId: 'crypto_789' };
  }

  async refund(transactionId: string): Promise<RefundResult> {
    // Crypto refunds work differently
    console.log(`Initiating crypto refund for ${transactionId}`);
    return { success: true, note: 'Refund sent to wallet' };
  }

  getName(): string {
    return 'Cryptocurrency';
  }
}

// POLYMORPHISM IN ACTION
class PaymentService {
  private processors: Map<string, IPaymentProcessor> = new Map();

  registerProcessor(type: string, processor: IPaymentProcessor): void {
    this.processors.set(type, processor);
  }

  async processPayment(
    type: string,
    amount: number
  ): Promise<PaymentResult> {
    const processor = this.processors.get(type);
    if (!processor) {
      throw new Error(`Unknown payment type: ${type}`);
    }

    // POLYMORPHISM: Same method call, different behavior
    // based on actual processor type
    console.log(`Using ${processor.getName()}`);
    return processor.processPayment(amount);
  }
}

// Usage
const service = new PaymentService();
service.registerProcessor('stripe', new StripeProcessor());
service.registerProcessor('paypal', new PayPalProcessor());
service.registerProcessor('crypto', new CryptoProcessor());

// Same method call, different implementations executed
await service.processPayment('stripe', 100);   // Stripe implementation
await service.processPayment('paypal', 100);   // PayPal implementation
await service.processPayment('crypto', 100);   // Crypto implementation
```

### Polymorphism in Your Codebase

```typescript
// All middleware factories produce compatible middleware (polymorphism)
type FastifyMiddleware = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<void>;

// Different factories, same output type
class AuthMiddlewareFactory {
  createAuthMiddleware(): FastifyMiddleware {
    return async (request, reply) => {
      // Auth-specific logic
    };
  }
}

class StoryRoleMiddlewareFactory {
  createRequireRole(role: string): FastifyMiddleware {
    return async (request, reply) => {
      // Role-specific logic
    };
  }
}

class RateLimitMiddlewareFactory {
  createRateLimiter(limit: number): FastifyMiddleware {
    return async (request, reply) => {
      // Rate limit logic
    };
  }
}

// All can be used in the same preHandler array (polymorphism)
fastify.post('/stories', {
  preHandler: [
    authFactory.createAuthMiddleware(),      // Returns FastifyMiddleware
    roleFactory.createRequireRole('author'), // Returns FastifyMiddleware
    rateLimitFactory.createRateLimiter(10),  // Returns FastifyMiddleware
  ],
}, controller.createStory);
```

### Polymorphism with Notification System

```typescript
// Interface defines the contract
interface INotificationChannel {
  send(notification: Notification): Promise<void>;
  supports(type: NotificationType): boolean;
}

// Multiple implementations with different behavior
class EmailChannel implements INotificationChannel {
  async send(notification: Notification): Promise<void> {
    // Send email
    await this.emailClient.send({
      to: notification.userEmail,
      subject: notification.title,
      html: notification.htmlContent,
    });
  }

  supports(type: NotificationType): boolean {
    return ['WELCOME', 'PASSWORD_RESET', 'WEEKLY_DIGEST'].includes(type);
  }
}

class PushChannel implements INotificationChannel {
  async send(notification: Notification): Promise<void> {
    // Send push notification
    await this.pushService.send({
      userId: notification.userId,
      title: notification.title,
      body: notification.shortMessage,
    });
  }

  supports(type: NotificationType): boolean {
    return ['NEW_MESSAGE', 'NEW_FOLLOWER', 'STORY_LIKE'].includes(type);
  }
}

class SlackChannel implements INotificationChannel {
  async send(notification: Notification): Promise<void> {
    // Send to Slack
    await this.slackClient.postMessage({
      channel: notification.slackChannel,
      text: notification.message,
    });
  }

  supports(type: NotificationType): boolean {
    return ['SYSTEM_ALERT', 'ERROR_REPORT'].includes(type);
  }
}

// Service uses polymorphism
class NotificationService {
  private channels: INotificationChannel[] = [];

  registerChannel(channel: INotificationChannel): void {
    this.channels.push(channel);
  }

  async notify(notification: Notification): Promise<void> {
    // Find all channels that support this notification type
    const supportingChannels = this.channels.filter(
      channel => channel.supports(notification.type)
    );

    // POLYMORPHISM: Same send() call, different implementations
    await Promise.all(
      supportingChannels.map(channel => channel.send(notification))
    );
  }
}

// Usage
const notificationService = new NotificationService();
notificationService.registerChannel(new EmailChannel(emailClient));
notificationService.registerChannel(new PushChannel(pushService));
notificationService.registerChannel(new SlackChannel(slackClient));

// Same method, different channels activated based on type
await notificationService.notify({
  type: 'WELCOME',
  userId: '123',
  // ... other data
}); // Only EmailChannel sends

await notificationService.notify({
  type: 'NEW_MESSAGE',
  userId: '123',
  // ...
}); // Only PushChannel sends

await notificationService.notify({
  type: 'SYSTEM_ALERT',
  // ...
}); // Only SlackChannel sends
```

---

## Real-World Examples from Your Codebase

### Example 1: Repository Pattern with Abstraction

```typescript
// ABSTRACTION: Interface defines what a repository can do
interface IRepository<T> {
  create(data: Partial<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findOne(filter: object): Promise<T | null>;
  findMany(filter: object): Promise<T[]>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

// ENCAPSULATION: BaseRepository hides MongoDB implementation
abstract class BaseRepository<TEntity, TDocument extends Document>
  implements IRepository<TEntity> {

  protected model: Model<TDocument>;  // Protected - accessible to subclasses

  constructor(model: Model<TDocument>) {
    this.model = model;
  }

  async create(data: Partial<TEntity>): Promise<TEntity> {
    const [doc] = await this.model.create([data]);
    return doc.toObject() as TEntity;
  }

  async findById(id: string): Promise<TEntity | null> {
    return this.model.findById(id).lean<TEntity>().exec();
  }

  // ... other methods hidden from consumers
}

// INHERITANCE: StoryRepository extends BaseRepository
@singleton()
class StoryRepository extends BaseRepository<IStory, IStoryDoc> {
  constructor() {
    super(Story);  // Pass model to parent
  }

  // POLYMORPHISM: Can override or add methods
  async findBySlug(slug: string): Promise<IStory | null> {
    return this.findOne({ slug });
  }
}

// CONSUMER: Service doesn't know about MongoDB
@singleton()
class StoryService extends BaseModule {
  constructor(
    @inject(TOKENS.StoryRepository)
    private storyRepo: IRepository<IStory>  // Depends on abstraction
  ) {
    super();
  }

  async getStory(slug: string): Promise<IStory> {
    // Service has no idea this uses MongoDB
    const story = await this.storyRepo.findOne({ slug });
    if (!story) this.throwNotFoundError('Story not found');
    return story;
  }
}
```

### Example 2: Middleware Factory Pattern

```typescript
// ABSTRACTION: All factories produce the same type
type Middleware = (req: FastifyRequest, reply: FastifyReply) => Promise<void>;

// ENCAPSULATION: Implementation details hidden in factory
@singleton()
class StoryRoleMiddlewareFactory {
  // Private dependencies
  private readonly storyRepo: StoryRepository;
  private readonly collaboratorRepo: StoryCollaboratorRepository;

  constructor(
    @inject(TOKENS.StoryRepository) storyRepo: StoryRepository,
    @inject(TOKENS.StoryCollaboratorRepository) collaboratorRepo: StoryCollaboratorRepository
  ) {
    this.storyRepo = storyRepo;
    this.collaboratorRepo = collaboratorRepo;
  }

  // POLYMORPHISM: Different methods produce different behavior,
  // but all return the same Middleware type
  createLoadContext(): Middleware {
    return async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const story = await this.storyRepo.findBySlug(slug);
      if (!story) throw ApiError.notFound('Story not found');

      const collaborator = await this.collaboratorRepo.findByStoryAndUser(
        slug,
        request.user.clerkId
      );

      request.storyContext = {
        story,
        userRole: collaborator?.role ?? null,
        isOwner: story.creatorId === request.user.clerkId,
      };
    };
  }

  createRequireRole(minimumRole: StoryCollaboratorRole): Middleware {
    return async (request, reply) => {
      const { storyContext } = request;
      if (!storyContext) throw ApiError.internalError('Context not loaded');

      if (!StoryCollaboratorRules.hasMinimumRole(storyContext.userRole, minimumRole)) {
        throw ApiError.forbidden(`Requires ${minimumRole} role or higher`);
      }
    };
  }

  createRequirePermission(permission: keyof StoryPermissions): Middleware {
    return async (request, reply) => {
      const { storyContext } = request;
      if (!storyContext) throw ApiError.internalError('Context not loaded');

      if (!StoryCollaboratorRules.hasPermission(storyContext.userRole, permission)) {
        throw ApiError.forbidden(`Missing permission: ${permission}`);
      }
    };
  }
}

// Usage - all middleware are the same type (polymorphism)
const guards = factory.createGuards();

fastify.post('/stories/:slug/chapters', {
  preHandler: [
    authMiddleware,           // Middleware type
    guards.loadContext,       // Middleware type (load story context)
    guards.canWriteChapters,  // Middleware type (check permission)
  ],
}, controller.createChapter);
```

### Example 3: Domain Rules as Static Abstraction

```typescript
// ABSTRACTION: Rules class hides business logic complexity
class StoryRules {
  // Constants - configuration abstracted
  static readonly DAILY_STORY_LIMIT = 3;
  static readonly MIN_TITLE_LENGTH = 3;
  static readonly MAX_TITLE_LENGTH = 100;
  static readonly MAX_DESCRIPTION_LENGTH = 2000;

  // Business rules abstracted to simple method calls
  static canCreateStory(todayCount: number): boolean {
    return todayCount < this.DAILY_STORY_LIMIT;
  }

  static canPublishStory(story: IStory, userId: string): boolean {
    return (
      story.creatorId === userId &&
      story.status === StoryStatus.DRAFT &&
      this.isStoryComplete(story)
    );
  }

  static isValidStatusTransition(
    current: StoryStatus,
    next: StoryStatus
  ): boolean {
    const validTransitions: Record<StoryStatus, StoryStatus[]> = {
      [StoryStatus.DRAFT]: [StoryStatus.PUBLISHED, StoryStatus.ARCHIVED],
      [StoryStatus.PUBLISHED]: [StoryStatus.ARCHIVED],
      [StoryStatus.ARCHIVED]: [StoryStatus.PUBLISHED, StoryStatus.DRAFT],
      [StoryStatus.DELETED]: [],
    };

    return validTransitions[current]?.includes(next) ?? false;
  }

  // Complex logic abstracted to simple boolean
  private static isStoryComplete(story: IStory): boolean {
    return (
      story.title.length >= this.MIN_TITLE_LENGTH &&
      story.description.length > 0 &&
      story.settings.genres.length > 0
    );
  }
}

// Service uses abstracted rules
@singleton()
class StoryService extends BaseModule {
  async publishStory(slug: string, userId: string): Promise<IStory> {
    const story = await this.storyRepo.findBySlug(slug);
    if (!story) this.throwNotFoundError('Story not found');

    // ABSTRACTION: Complex business logic hidden behind simple method
    if (!StoryRules.canPublishStory(story, userId)) {
      this.throwForbiddenError('Cannot publish this story');
    }

    // ABSTRACTION: Status transition validation hidden
    if (!StoryRules.isValidStatusTransition(story.status, StoryStatus.PUBLISHED)) {
      this.throwBadRequest('Invalid status transition');
    }

    return this.storyRepo.updateBySlug(slug, {
      status: StoryStatus.PUBLISHED,
      publishedAt: new Date(),
    });
  }
}
```

---

## Common Patterns Using OOP

### 1. Factory Pattern

```typescript
// Factory creates objects without exposing instantiation logic

interface INotification {
  type: string;
  title: string;
  message: string;
  send(): Promise<void>;
}

class NotificationFactory {
  static create(type: string, data: NotificationData): INotification {
    switch (type) {
      case 'email':
        return new EmailNotification(data);
      case 'push':
        return new PushNotification(data);
      case 'sms':
        return new SmsNotification(data);
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  }
}

// Usage - consumer doesn't know concrete classes
const notification = NotificationFactory.create('email', {
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Thanks for signing up',
});
await notification.send();
```

### 2. Strategy Pattern

```typescript
// Strategy allows selecting algorithm at runtime

interface IPricingStrategy {
  calculate(basePrice: number): number;
  getName(): string;
}

class RegularPricing implements IPricingStrategy {
  calculate(basePrice: number): number {
    return basePrice;
  }
  getName(): string { return 'Regular'; }
}

class PremiumPricing implements IPricingStrategy {
  calculate(basePrice: number): number {
    return basePrice * 0.9; // 10% discount
  }
  getName(): string { return 'Premium'; }
}

class VIPPricing implements IPricingStrategy {
  calculate(basePrice: number): number {
    return basePrice * 0.75; // 25% discount
  }
  getName(): string { return 'VIP'; }
}

class PricingService {
  private strategy: IPricingStrategy;

  setStrategy(strategy: IPricingStrategy): void {
    this.strategy = strategy;
  }

  calculatePrice(basePrice: number): number {
    return this.strategy.calculate(basePrice);
  }
}

// Usage
const pricing = new PricingService();

pricing.setStrategy(new RegularPricing());
console.log(pricing.calculatePrice(100)); // 100

pricing.setStrategy(new VIPPricing());
console.log(pricing.calculatePrice(100)); // 75
```

### 3. Template Method Pattern

```typescript
// Template defines algorithm skeleton, subclasses fill in specifics

abstract class DataExporter {
  // Template method - defines the algorithm
  async export(data: any[]): Promise<string> {
    const validated = this.validate(data);
    const formatted = this.format(validated);
    const output = await this.write(formatted);
    return output;
  }

  // Common validation
  protected validate(data: any[]): any[] {
    return data.filter(item => item !== null);
  }

  // Abstract - subclasses must implement
  protected abstract format(data: any[]): string;
  protected abstract write(content: string): Promise<string>;
}

class CsvExporter extends DataExporter {
  protected format(data: any[]): string {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => Object.values(item).join(','));
    return [headers, ...rows].join('\n');
  }

  protected async write(content: string): Promise<string> {
    const filename = `export_${Date.now()}.csv`;
    await fs.writeFile(filename, content);
    return filename;
  }
}

class JsonExporter extends DataExporter {
  protected format(data: any[]): string {
    return JSON.stringify(data, null, 2);
  }

  protected async write(content: string): Promise<string> {
    const filename = `export_${Date.now()}.json`;
    await fs.writeFile(filename, content);
    return filename;
  }
}

// Usage
const csvExporter = new CsvExporter();
await csvExporter.export(stories); // Uses CSV formatting

const jsonExporter = new JsonExporter();
await jsonExporter.export(stories); // Uses JSON formatting
```

### 4. Observer Pattern

```typescript
// Observer allows objects to subscribe to events

interface IObserver {
  update(event: string, data: any): void;
}

interface ISubject {
  attach(observer: IObserver): void;
  detach(observer: IObserver): void;
  notify(event: string, data: any): void;
}

class StoryEventEmitter implements ISubject {
  private observers: IObserver[] = [];

  attach(observer: IObserver): void {
    this.observers.push(observer);
  }

  detach(observer: IObserver): void {
    this.observers = this.observers.filter(o => o !== observer);
  }

  notify(event: string, data: any): void {
    this.observers.forEach(observer => observer.update(event, data));
  }
}

class NotificationObserver implements IObserver {
  update(event: string, data: any): void {
    if (event === 'story.published') {
      console.log(`Sending notification: ${data.title} was published`);
    }
  }
}

class AnalyticsObserver implements IObserver {
  update(event: string, data: any): void {
    console.log(`Tracking event: ${event}`, data);
  }
}

class CacheObserver implements IObserver {
  update(event: string, data: any): void {
    if (event === 'story.updated' || event === 'story.published') {
      console.log(`Invalidating cache for story: ${data.slug}`);
    }
  }
}

// Usage
const storyEvents = new StoryEventEmitter();
storyEvents.attach(new NotificationObserver());
storyEvents.attach(new AnalyticsObserver());
storyEvents.attach(new CacheObserver());

// When story is published, all observers are notified
storyEvents.notify('story.published', { title: 'My Story', slug: 'my-story' });
```

---

## Best Practices

### 1. Program to Interfaces, Not Implementations

```typescript
// ❌ BAD: Depending on concrete class
class StoryService {
  private repo = new MongoStoryRepository();  // Concrete dependency
}

// ✅ GOOD: Depending on interface
class StoryService {
  constructor(private repo: IStoryRepository) {}  // Abstract dependency
}
```

### 2. Keep Abstractions Focused (ISP)

```typescript
// ❌ BAD: Fat interface
interface IUserService {
  createUser(): void;
  deleteUser(): void;
  sendEmail(): void;
  generateReport(): void;
  processPayment(): void;
}

// ✅ GOOD: Segregated interfaces
interface IUserService {
  createUser(): void;
  deleteUser(): void;
}

interface IEmailService {
  sendEmail(): void;
}

interface IReportService {
  generateReport(): void;
}
```

### 3. Favor Composition Over Inheritance

```typescript
// ❌ BAD: Deep inheritance hierarchy
class Entity { }
class LivingEntity extends Entity { }
class Animal extends LivingEntity { }
class Mammal extends Animal { }
class Dog extends Mammal { }

// ✅ GOOD: Composition
class Dog {
  constructor(
    private movement: IMovement,      // Can walk, run
    private sound: ISound,            // Can bark
    private feeding: IFeeding         // Can eat
  ) {}
}
```

### 4. Use Access Modifiers Properly

```typescript
class UserService {
  // Public: Part of the API
  public async getUser(id: string): Promise<IUser> { }

  // Protected: Available to subclasses
  protected validateUser(user: IUser): boolean { }

  // Private: Implementation detail
  private async fetchFromCache(id: string): Promise<IUser | null> { }
}
```

### 5. Make Classes Open for Extension

```typescript
// ✅ GOOD: Easy to extend
abstract class BaseExporter {
  abstract format(data: any): string;

  async export(data: any): Promise<void> {
    const formatted = this.format(data);
    await this.save(formatted);
  }

  protected async save(content: string): Promise<void> {
    // Default implementation
  }
}

// Easy to add new exporters without modifying base
class XmlExporter extends BaseExporter {
  format(data: any): string {
    return `<data>${JSON.stringify(data)}</data>`;
  }
}
```

---

## Summary

| Concept | Key Point | Code Indicator |
|---------|-----------|----------------|
| **Abstraction** | Hide complexity, show essentials | `interface`, `abstract class` |
| **Encapsulation** | Protect data, expose API | `private`, `protected`, getters/setters |
| **Inheritance** | Reuse code via hierarchy | `extends`, `super()` |
| **Polymorphism** | Same interface, different behavior | Method overriding, interface implementation |

### Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OOP QUICK REFERENCE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ABSTRACTION          ENCAPSULATION        INHERITANCE       POLYMORPHISM  │
│  ───────────          ─────────────        ───────────       ────────────  │
│  interface IRepo      private _data        class Dog         dog.speak()   │
│  abstract class       public getData()     extends Animal    cat.speak()   │
│                       protected helper()   super()           Same call,    │
│  Hides HOW            Protects state       Reuses code       diff result   │
│                                                                             │
│  USE WHEN:            USE WHEN:            USE WHEN:         USE WHEN:     │
│  - Define contract    - Protect data       - IS-A relation   - Same action │
│  - Hide complexity    - Control access     - Share behavior  - Diff types  │
│  - Swap impls         - Validate input     - Override method - Collections │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

This guide covers the fundamentals of OOP with practical examples from your StoryChain codebase. Apply these concepts consistently to create maintainable, extensible, and testable code.
