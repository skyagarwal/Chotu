module.exports = {
  entry: './src/main.ts',
  target: 'node',
  mode: 'production',
  externals: {
    '@nestjs/microservices': 'commonjs @nestjs/microservices',
    '@nestjs/websockets': 'commonjs @nestjs/websockets',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'main.js',
    path: require('path').resolve(__dirname, 'dist'),
  },
};
