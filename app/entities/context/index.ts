import type { Chat } from "../chat";
import type { Profile } from "../profile";
import type { Routine, RoutineTask } from "../routines";

/**
 * Контекст, который передается от delivery -> usecase -> repository
 * Хранит все необходимые данные для работы с конкретным юзером
 * @param profile - профиль юзера
 * @param chat - чат юзера
 * @param routine - рутина юзера
 * @param routineTasks - задачи юзера
 */
export type Context = {
  profile: Profile;
  chat: Chat;
  routine: Routine;
  routineTasks: RoutineTask[];
};