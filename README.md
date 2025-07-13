# Vocali

A modern voice interface platform built with React.js, TypeScript, Tailwind CSS, and Vite.

## 🚀 Features

- **React 19** with TypeScript for type safety
- **Tailwind CSS** for modern, responsive styling
- **Vite** for fast development and building
- **Modern UI** with beautiful gradients and animations
- **Hot Module Replacement (HMR)** for instant updates
- **Real-time Audio Recording** with live transcription using Speechmatics
- **Audio File Upload** with transcription processing
- **User Authentication** with Redux state management

## 🛠️ Tech Stack

- **Frontend**: React.js 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Package Manager**: npm
- **State Management**: Redux Toolkit
- **Real-time Transcription**: Speechmatics API
- **HTTP Client**: Axios
- **Icons**: Lucide React

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd vocali
```

2. Install dependencies:
```bash
npm install
```

## 🚀 Development

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api

# Speechmatics Configuration
# Get your API key from: https://portal.speechmatics.com/
VITE_SPEECHMATICS_API_KEY=your_speechmatics_api_key_here
```

### Start Development Server

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Build

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## 🚀 Deployment

### Deploy to Vercel

This project is configured for easy deployment to Vercel:

1. **Install Vercel CLI** (optional):
```bash
npm i -g vercel
```

2. **Deploy via Vercel Dashboard**:
   - Push your code to GitHub
   - Connect your repository to Vercel
   - Vercel will automatically detect the Vite configuration
   - Set your environment variables in the Vercel dashboard

3. **Deploy via CLI**:
```bash
vercel
```

4. **Environment Variables for Production**:
   Make sure to set these in your Vercel project settings:
   - `VITE_API_BASE_URL` - Your production API URL
   - `VITE_SPEECHMATICS_API_KEY` - Your Speechmatics API key

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. The built files will be in the `dist` directory
3. Deploy the `dist` directory to your hosting provider

## 📁 Project Structure

```
vocali/
├── src/
│   ├── App.tsx          # Main application component
│   ├── index.css        # Global styles with Tailwind
│   └── main.tsx         # Application entry point
├── public/              # Static assets
├── index.html           # HTML template
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
├── vite.config.ts       # Vite configuration
├── vercel.json          # Vercel deployment configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Project dependencies
```

## 🎨 Customization

The project uses Tailwind CSS for styling. You can customize the design by:

1. Modifying `tailwind.config.js` for theme customization
2. Adding custom components in `src/components/`
3. Updating the main App component in `src/App.tsx`

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server (for Vercel)
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
