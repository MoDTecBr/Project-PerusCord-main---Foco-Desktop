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
exports.DmController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const dm_service_1 = require("./dm.service");
let DmController = class DmController {
    dm;
    constructor(dm) {
        this.dm = dm;
    }
    list(user) {
        return this.dm.listForUser(user.id);
    }
    getOrCreate(username, user) {
        return this.dm.getOrCreateWithFriend(user.id, username);
    }
};
exports.DmController = DmController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DmController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(':username'),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DmController.prototype, "getOrCreate", null);
exports.DmController = DmController = __decorate([
    (0, common_1.Controller)('dm'),
    __metadata("design:paramtypes", [dm_service_1.DmService])
], DmController);
//# sourceMappingURL=dm.controller.js.map