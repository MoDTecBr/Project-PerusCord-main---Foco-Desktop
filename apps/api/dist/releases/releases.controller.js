"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReleasesController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs_1 = require("fs");
const path_1 = require("path");
const public_decorator_1 = require("../common/decorators/public.decorator");
const CONTENT_TYPES = {
    '.json': 'application/json',
    '.zip': 'application/zip',
    '.exe': 'application/octet-stream',
};
let ReleasesController = class ReleasesController {
    releasesDir;
    constructor(config) {
        this.releasesDir = (0, path_1.resolve)(config.get('releases', { infer: true }).dir);
    }
    serve(req, res) {
        const requestedPath = req.params[0] ?? '';
        const filePath = (0, path_1.resolve)((0, path_1.join)(this.releasesDir, requestedPath));
        if (!filePath.startsWith(this.releasesDir) || !(0, fs_1.existsSync)(filePath) || !(0, fs_1.statSync)(filePath).isFile()) {
            throw new common_1.NotFoundException('Arquivo de release não encontrado.');
        }
        const contentType = CONTENT_TYPES[(0, path_1.extname)(filePath).toLowerCase()] ?? 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        (0, fs_1.createReadStream)(filePath).pipe(res);
    }
};
exports.ReleasesController = ReleasesController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ReleasesController.prototype, "serve", null);
exports.ReleasesController = ReleasesController = __decorate([
    (0, common_1.Controller)('releases'),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ReleasesController);
//# sourceMappingURL=releases.controller.js.map