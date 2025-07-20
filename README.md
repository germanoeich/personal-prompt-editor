# Visual Prompt Builder

> [!WARNING]
> This project was 99% coded by AI with human guidance. There is NO SECURITY built in, DO NOT EXPOSE THIS TO THE INTERNET. 

An IDE-like visual prompt management system for Large Language Models (LLMs) that enables users to create, organize, and manage reusable prompts through an intuitive drag-and-drop interface.

<img width="1920" height="992" alt="image" src="https://github.com/user-attachments/assets/5d8d1a64-36d5-4b2a-8b6a-31c51bdfab8a" />

## Features

### 🎨 Visual Prompt Composition
- **Drag-and-drop interface** for building prompts from modular blocks
- **Multi-tab editing** - work on multiple prompts simultaneously
- **Real-time preview** with variable substitution
- **Rich text editor** supporting both plain text and preset blocks

### 📦 Block Management
- **Reusable preset blocks** that can be inserted into any prompt
- **Override functionality** - customize blocks within specific prompts
- **Usage tracking** - see how often each block is used
- **Tagging and categorization** for easy organization

### 🔧 Variable System
- **Dynamic variables** using `{{variableName}}` syntax
- **Automatic extraction** of variables from content
- **Real-time substitution** in preview
- **Special variables** like `{{originalText}}` for block overrides

### 📚 Version Control (Not fully implemented)
- **Automatic versioning** for both blocks and prompts
- **Version history** with content snapshots
- **Rollback capability** (coming soon)

### 💾 Storage Format
The system uses a custom XML-like format for storing prompt compositions:
```xml
<text>This is a text section with a {{variable}}</text>
<block id="123" />
<block id="456">This is an overridden block</block>
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/germanoeich/personal-prompt-editor.git
cd personal-prompt-editor
```

2. Install dependencies:
```bash
npm install
```

3. Run database migrations:
```bash
npm run migrate
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Creating a Prompt

1. Click "New Prompt" in the left sidebar
2. Enter a title for your prompt
3. Start typing in the text editor or drag preset blocks from the right sidebar
4. Use `{{variableName}}` syntax to add variables
5. Fill in variable values in the left sidebar
6. Preview your composed prompt in the right panel

### Creating Preset Blocks

1. Open the "Blocks" section in the right sidebar
2. Click "Create Block"
3. Enter a title and content
4. Add tags and categories for organization
5. Save the block - it's now available for use in any prompt

### Overriding Blocks

1. Add a block to your prompt
2. Click the edit icon on the block
3. Modify the content (use `{{originalText}}` to reference the original)
4. The block will show an orange "Override" indicator
5. You can reset to original or save the override as a new preset

### Keyboard Shortcuts

- `Ctrl+Enter` - Save current edit
- `Esc` - Cancel current edit
- `Ctrl+S` - Save prompt

## API Reference

### Blocks API

- `GET /api/blocks` - List all blocks
  - Query params: `search`, `type`, `tags`, `categories`
- `POST /api/blocks` - Create a new block
- `GET /api/blocks/:id` - Get a specific block
- `PUT /api/blocks/:id` - Update a block
- `DELETE /api/blocks/:id` - Delete a block

### Prompts API

- `GET /api/prompts` - List all prompts
  - Query params: `search`, `tags`, `categories`
- `POST /api/prompts` - Create a new prompt
- `GET /api/prompts/:id` - Get a specific prompt
- `PUT /api/prompts/:id` - Update a prompt
- `DELETE /api/prompts/:id` - Delete a prompt

## Database Schema

The application uses SQLite with the following main tables:

- **blocks** - Stores reusable content blocks
- **block_versions** - Version history for blocks
- **prompts** - Stores complete prompts
- **prompt_versions** - Version history for prompts
- **rating_categories** - Categories for rating prompts
- **ratings** - Ratings for prompt versions

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

### Database Migrations

Create a new migration:
```bash
npm run migrate:make migration_name
```

Run migrations:
```bash
npm run migrate
```

Rollback migrations:
```bash
npm run migrate:rollback
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the GNU GPLv3 License - see the LICENSE file for details.

## Acknowledgments

- Built with Next.js and React
- UI components from Heroicons
- Drag and drop functionality powered by @dnd-kit
