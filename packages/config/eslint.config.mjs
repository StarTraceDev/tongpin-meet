// @tongpin/config 自身的 lint 配置（其他包引用 ./eslint/* 预设，不引用这个文件）
import node from './eslint/node.mjs';

export default [...node, { ignores: ['tsconfig/**'] }];
