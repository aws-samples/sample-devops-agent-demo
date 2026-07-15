"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eslint_plugin_prettier_1 = __importDefault(require("eslint-plugin-prettier"));
const globals_1 = __importDefault(require("globals"));
const typescript_eslint_1 = __importDefault(require("typescript-eslint"));
exports.default = typescript_eslint_1.default.config({ ignores: ["**/dist", "**/cdk.out"] }, {
    extends: [...typescript_eslint_1.default.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
        ecmaVersion: 2020,
        globals: globals_1.default.browser,
    },
    linterOptions: {
        reportUnusedDisableDirectives: false,
    },
    plugins: {
        prettier: eslint_plugin_prettier_1.default,
    },
    rules: {
        "no-empty": ["error", { allowEmptyCatch: true }],
        "prettier/prettier": "warn",
        "@typescript-eslint/no-unused-vars": "warn",
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNsaW50LmNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVzbGludC5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxvRkFBOEM7QUFDOUMsc0RBQThCO0FBQzlCLDBFQUF5QztBQUV6QyxrQkFBZSwyQkFBUSxDQUFDLE1BQU0sQ0FDMUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLEVBQUUsRUFDdEM7SUFDSSxPQUFPLEVBQUUsQ0FBQyxHQUFHLDJCQUFRLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztJQUMxQyxLQUFLLEVBQUUsQ0FBQyxlQUFlLENBQUM7SUFDeEIsZUFBZSxFQUFFO1FBQ2IsV0FBVyxFQUFFLElBQUk7UUFDakIsT0FBTyxFQUFFLGlCQUFPLENBQUMsT0FBTztLQUMzQjtJQUNELGFBQWEsRUFBRTtRQUNYLDZCQUE2QixFQUFFLEtBQUs7S0FDdkM7SUFDRCxPQUFPLEVBQUU7UUFDTCxRQUFRLEVBQVIsZ0NBQVE7S0FDWDtJQUNELEtBQUssRUFBRTtRQUNILFVBQVUsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUNoRCxtQkFBbUIsRUFBRSxNQUFNO1FBQzNCLG1DQUFtQyxFQUFFLE1BQU07S0FDOUM7Q0FDSixDQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcHJldHRpZXIgZnJvbSBcImVzbGludC1wbHVnaW4tcHJldHRpZXJcIjtcbmltcG9ydCBnbG9iYWxzIGZyb20gXCJnbG9iYWxzXCI7XG5pbXBvcnQgdHNlc2xpbnQgZnJvbSBcInR5cGVzY3JpcHQtZXNsaW50XCI7XG5cbmV4cG9ydCBkZWZhdWx0IHRzZXNsaW50LmNvbmZpZyhcbiAgICB7IGlnbm9yZXM6IFtcIioqL2Rpc3RcIiwgXCIqKi9jZGsub3V0XCJdIH0sXG4gICAge1xuICAgICAgICBleHRlbmRzOiBbLi4udHNlc2xpbnQuY29uZmlncy5yZWNvbW1lbmRlZF0sXG4gICAgICAgIGZpbGVzOiBbXCIqKi8qLnt0cyx0c3h9XCJdLFxuICAgICAgICBsYW5ndWFnZU9wdGlvbnM6IHtcbiAgICAgICAgICAgIGVjbWFWZXJzaW9uOiAyMDIwLFxuICAgICAgICAgICAgZ2xvYmFsczogZ2xvYmFscy5icm93c2VyLFxuICAgICAgICB9LFxuICAgICAgICBsaW50ZXJPcHRpb25zOiB7XG4gICAgICAgICAgICByZXBvcnRVbnVzZWREaXNhYmxlRGlyZWN0aXZlczogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIHBsdWdpbnM6IHtcbiAgICAgICAgICAgIHByZXR0aWVyLFxuICAgICAgICB9LFxuICAgICAgICBydWxlczoge1xuICAgICAgICAgICAgXCJuby1lbXB0eVwiOiBbXCJlcnJvclwiLCB7IGFsbG93RW1wdHlDYXRjaDogdHJ1ZSB9XSxcbiAgICAgICAgICAgIFwicHJldHRpZXIvcHJldHRpZXJcIjogXCJ3YXJuXCIsXG4gICAgICAgICAgICBcIkB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1wiOiBcIndhcm5cIixcbiAgICAgICAgfSxcbiAgICB9XG4pO1xuIl19