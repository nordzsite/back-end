package main.webapp;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import main.webapp.service.AddService;

@Controller
// This is an annotation that says that "AddController" Class is a controller that will be looked into
public class AddController {
//	"@RequestMapping" will tell the server to map this handler to path "/add"
	@RequestMapping("/add")
//	This will return a ModelAndView class because we are sending a file instead
	public ModelAndView add(
			/*
			 * Instead of using the request object everytime for the params,
			 * You can make spring directly pass the params as arguments with @RequestParam annotation
			 */
			@RequestParam("t1") int i, 
			@RequestParam("t2") int j,
			HttpServletRequest request,HttpServletResponse response) {
//		request.getParameter will get the parameter in the URL
//		int i = Integer.parseInt(request.getParameter("t1"));
//		int j = Integer.parseInt(request.getParameter("t2"));
//		This connects to a service which will add together numbers i and j
		AddService as = new AddService();
		int k = as.add(i,j);
//		Instantiate Model and View class
		ModelAndView mv = new ModelAndView();
//		Choose view name, in this case "display.jsp"
		/*
		 * Do note that, if you don't want to specify which view engine(jsp)
		 * But want to do that in configuration, you follow what the configuration says
		 */
		mv.setViewName("display");
//		Add an object with key(result=k) result(will be used in display.jsp) 
		mv.addObject("result",k);
		mv.addObject("first",i);
		mv.addObject("second",j);
//		return ModelAndView class object
		return mv;
	}
}
