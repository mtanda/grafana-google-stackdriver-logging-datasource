import GoogleStackdriverLoggingDatasource from './datasource';
import { GoogleStackdriverLoggingQueryCtrl } from './query_ctrl';
import { GoogleStackdriverLoggingAnnotationsQueryCtrl } from './annotations_query_ctrl';

class GoogleStackdriverLoggingConfigCtrl {
  static templateUrl = 'partials/config.html';
}

export {
  GoogleStackdriverLoggingDatasource as Datasource,
  GoogleStackdriverLoggingConfigCtrl as ConfigCtrl,
  GoogleStackdriverLoggingQueryCtrl as QueryCtrl,
  GoogleStackdriverLoggingAnnotationsQueryCtrl as AnnotationsQueryCtrl
};
