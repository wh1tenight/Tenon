import { IServerConfig, tenonAppType } from "./app.interface";
import Koa from "koa";
import { io } from "./io";
import { CONSTANT } from "../constant";
import { initModels } from "../models";
import { initModules } from "../modules";
import { initControllers } from "../controller";
import { initServices } from "../service";
import { compose } from "@tenon/shared";

export * from "./app.interface";

export const createServer = async (config: IServerConfig): Promise<tenonAppType> => {
  const { server } = config;
  const { port, name } = server;

  // app
  const koaApp = new Koa();
  const tenonApp: tenonAppType = koaApp as tenonAppType;
  tenonApp.$config = config;

  // models
  if (config.mongodb) {
    await initModels(tenonApp);
  }

  // modules
  await initModules(tenonApp);

  // services
  if (config.services) {
    await initServices(tenonApp);
  }

  // controllers
  if (config.controllers) {
    await initControllers(tenonApp);
  }

  tenonApp.start = () => {
    // listen
    tenonApp.listen(port, () => {
      io.log(
        compose(io.bold, io.hex('#e81'))(`${name || CONSTANT.defaultServerName}`),
        `is running at`,
        compose(io.bold, io.hex('#1e1'))(`http://localhost:${port}`),
      );
      io.log(
        io.bold.white.bgHex('#a5f')('Server launch succeeded!'),
      );
    });
  }

  return tenonApp;
}