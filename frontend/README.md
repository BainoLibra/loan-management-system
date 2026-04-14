# Frontend - Loan Management System

React-based web interface for the Loan Management System. Provides user-friendly dashboards for loan officers, clients, and administrators.

## Quick Start

### Prerequisites
- Node.js v18+
- npm or yarn
- Backend API running at `http://localhost:4000`

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

Opens at `http://localhost:3000` with auto-reload.

### Production Build

```bash
npm run build
```

## Vercel Deployment

See [../VERCEL_DEPLOYMENT.md](../VERCEL_DEPLOYMENT.md) for complete instructions.

Quick deploy:
```bash
npm i -g vercel
vercel --prod  # Set REACT_APP_API_URL to your backend URL
```

## Environment Variables

Create `.env` file (see `.env.example`):
```
REACT_APP_API_URL=http://localhost:4000  # or your Vercel backend URL
```

## Available Scripts

### `npm start`

Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page reloads when you make changes.

### `npm run build`

Builds the app for production to the `build` folder.

Correctly bundles React in production mode and optimizes for best performance.

### `npm test`

Launches the test runner in interactive watch mode.

See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

## Test Credentials

```
Email: admin@example.com
Password: admin
```

Auto-seeded on backend initialization.

## Features

- User authentication (JWT)
- Client management
- Loan applications & tracking
- Repayment recording
- Aging reports
- Audit logs
- User management (admin)

## Learn More

- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [Vercel Deployment Documentation](https://vercel.com/docs)
- [React Documentation](https://react.dev)
- [React Router Documentation](https://reactrouter.com)

## License

MIT


### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
