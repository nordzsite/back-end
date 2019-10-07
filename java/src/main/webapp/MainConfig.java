package main.webapp;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.view.InternalResourceViewResolver;
//	This is an annotation based configuration file
@Configuration
//	Configuration annotation required
@ComponentScan({"main.webapp"})
//	This would scan through the different controllers and components the webapp will use
public class MainConfig {
	@Bean
	public InternalResourceViewResolver viewResolver() {
//		This is to universally configure the view path and extension, in case the view engine needs to change
		InternalResourceViewResolver vr = new InternalResourceViewResolver();
		vr.setPrefix("/WEB-INF/views/");
		vr.setSuffix(".jsp");
		return vr;
	}
}
